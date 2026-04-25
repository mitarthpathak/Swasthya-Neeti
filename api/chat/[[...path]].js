import { connectToDatabase, isDatabaseConfigured } from '../_shared/db.js';
import { ChatMessage } from '../_shared/models.js';
import { getDatabaseHealth } from '../_shared/database.js';
import { fetchHealthUpdates } from '../_shared/healthUpdates.js';
import {
  generateHealthReply,
  generateSuggestedReplies,
  getGroqHealth,
  isGroqConfigured,
  translateUiCopy,
} from '../_shared/groq.js';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';

function dbConfigured() {
  return isDatabaseConfigured() && mongoose.connection.readyState === 1;
}

async function saveChatMessage(data) {
  if (!dbConfigured()) return null;
  return ChatMessage.create(data);
}

async function getRecentConversations(userEmail, limit = 10) {
  if (!userEmail || !dbConfigured()) return [];
  return ChatMessage.aggregate([
    { $match: { userEmail, role: 'user' } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$conversationId', preview: { $first: '$content' }, language: { $first: '$language' }, updatedAt: { $first: '$createdAt' } } },
    { $sort: { updatedAt: -1 } },
    { $limit: limit },
    { $project: { _id: 0, conversationId: '$_id', preview: 1, language: 1, updatedAt: 1 } },
  ]);
}

async function getConversationMessages(userEmail, conversationId) {
  if (!userEmail || !conversationId || !dbConfigured()) return [];
  const msgs = await ChatMessage.find({ userEmail, conversationId }).sort({ createdAt: 1 }).lean();
  return msgs.map(m => ({ id: m.id, conversationId: m.conversationId, userEmail: m.userEmail, username: m.username, role: m.role, language: m.language, content: m.content, model: m.model, createdAt: m.createdAt }));
}

async function deleteConversationMessages(userEmail, conversationId) {
  if (!userEmail || !conversationId || !dbConfigured()) return { deletedCount: 0 };
  const r = await ChatMessage.deleteMany({ userEmail, conversationId });
  return { deletedCount: r.deletedCount || 0 };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await connectToDatabase();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/chat\/?/, '');

  // GET /api/chat/history
  if (req.method === 'GET' && (path === 'history' || path === '')) {
    const userEmail = String(url.searchParams.get('userEmail') || '').trim();
    if (!userEmail) return res.status(400).json({ success: false, error: 'userEmail is required' });
    if (!isDatabaseConfigured()) return res.json({ success: true, conversations: [], saved: false });
    try {
      const conversations = await getRecentConversations(userEmail);
      return res.json({ success: true, conversations, saved: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message || 'Failed to fetch chat history' });
    }
  }

  // GET /api/chat/conversation
  if (req.method === 'GET' && path === 'conversation') {
    const userEmail = String(url.searchParams.get('userEmail') || '').trim();
    const conversationId = String(url.searchParams.get('conversationId') || '').trim();
    if (!userEmail || !conversationId) return res.status(400).json({ success: false, error: 'userEmail and conversationId are required' });
    if (!isDatabaseConfigured()) return res.json({ success: true, messages: [], saved: false });
    try {
      const messages = await getConversationMessages(userEmail, conversationId);
      return res.json({ success: true, conversationId, messages, saved: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // DELETE /api/chat/conversation
  if (req.method === 'DELETE' && path === 'conversation') {
    const userEmail = String(url.searchParams.get('userEmail') || '').trim();
    const conversationId = String(url.searchParams.get('conversationId') || '').trim();
    if (!userEmail || !conversationId) return res.status(400).json({ success: false, error: 'userEmail and conversationId are required' });
    if (!isDatabaseConfigured()) return res.json({ success: true, deletedCount: 0, saved: false });
    try {
      const result = await deleteConversationMessages(userEmail, conversationId);
      return res.json({ success: true, conversationId, deletedCount: result.deletedCount, saved: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // GET /api/chat/history/:conversationId
  if (req.method === 'GET' && path.startsWith('history/')) {
    const conversationId = path.replace('history/', '').trim();
    const userEmail = String(url.searchParams.get('userEmail') || '').trim();
    if (!userEmail || !conversationId) return res.status(400).json({ success: false, error: 'userEmail and conversationId are required' });
    if (!isDatabaseConfigured()) return res.json({ success: true, messages: [], saved: false });
    try {
      const messages = await getConversationMessages(userEmail, conversationId);
      return res.json({ success: true, conversationId, messages, saved: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // POST /api/chat/translate-ui
  if (req.method === 'POST' && path === 'translate-ui') {
    const language = String(req.body?.language || 'English').trim();
    const copy = req.body?.copy;
    if (!copy || typeof copy !== 'object' || Array.isArray(copy)) return res.status(400).json({ success: false, error: 'copy must be a JSON object' });
    try {
      const translated = await translateUiCopy({ targetLanguage: language, copy });
      return res.json({ success: true, language, copy: translated });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message || 'UI translation failed' });
    }
  }

  // POST /api/chat (main chat endpoint — handle both /api/chat and /api/chat/)
  if (req.method === 'POST' && (path === '' || path === '/')) {
    const message = String(req.body?.message || '').trim();
    const language = String(req.body?.language || 'English').trim();
    const conversationId = (req.body?.conversationId && String(req.body.conversationId).trim()) || randomUUID();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const user = req.body?.user && typeof req.body.user === 'object' ? req.body.user : null;
    const userEmail = typeof user?.email === 'string' ? user.email.trim() : null;
    const username = typeof user?.username === 'string' ? user.username.trim() : null;

    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    if (!isGroqConfigured()) return res.status(500).json({ success: false, error: 'GROQ_API_KEY is not configured on the server' });

    try {
      const reply = await generateHealthReply({ message, language, history });
      let suggestions = [];
      try {
        suggestions = await generateSuggestedReplies({ language, userMessage: message, assistantReply: reply.content });
      } catch {}

      let saved = false;
      if (isDatabaseConfigured() && userEmail && dbConfigured()) {
        await saveChatMessage({ id: randomUUID(), conversationId, userEmail, username, role: 'user', language, content: message, metadata: { source: 'chat-ui' } });
        await saveChatMessage({ id: randomUUID(), conversationId, userEmail, username, role: 'assistant', language, content: reply.content, model: reply.model, metadata: { source: 'chat-ui' } });
        saved = true;
      }

      return res.json({ success: true, conversationId, reply: reply.content, model: reply.model, suggestions, saved });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message || 'Chat request failed' });
    }
  }

  return res.status(404).json({ success: false, error: 'Not found' });
}
