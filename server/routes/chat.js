import express from 'express';
import { randomUUID } from 'crypto';
import { deleteConversationMessages, getConversationMessages, getDatabaseHealth, getRecentConversations, isDatabaseConfigured, saveChatMessage } from '../lib/database.js';
import { fetchHealthUpdates } from '../lib/healthUpdates.js';
import { generateHealthReply, generateSuggestedReplies, getGroqHealth, isGroqConfigured, translateUiCopy } from '../lib/groq.js';

const router = express.Router();

router.get('/health', async (_req, res) => {
  const [database, ai] = await Promise.all([getDatabaseHealth(), getGroqHealth()]);

  res.json({
    success: true,
    status: {
      api: 'ok',
      database,
      ai,
    },
  });
});

router.get('/chat/history', async (req, res) => {
  const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim() : '';

  if (!userEmail) {
    return res.status(400).json({
      success: false,
      error: 'userEmail is required',
    });
  }

  if (!isDatabaseConfigured()) {
    return res.json({
      success: true,
      conversations: [],
      saved: false,
    });
  }

  try {
    const conversations = await getRecentConversations(userEmail);
    return res.json({
      success: true,
      conversations,
      saved: true,
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chat history',
    });
  }
});

router.get('/chat/conversation', async (req, res) => {
  const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim() : '';
  const conversationId =
    typeof req.query.conversationId === 'string' ? req.query.conversationId.trim() : '';

  if (!userEmail || !conversationId) {
    return res.status(400).json({
      success: false,
      error: 'userEmail and conversationId are required',
    });
  }

  if (!isDatabaseConfigured()) {
    return res.json({
      success: true,
      messages: [],
      saved: false,
    });
  }

  try {
    const messages = await getConversationMessages(userEmail, conversationId);
    return res.json({
      success: true,
      conversationId,
      messages,
      saved: true,
    });
  } catch (error) {
    console.error('Conversation history error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversation history',
    });
  }
});

router.get('/chat/history/:conversationId', async (req, res) => {
  const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim() : '';
  const conversationId =
    typeof req.params.conversationId === 'string' ? req.params.conversationId.trim() : '';

  if (!userEmail || !conversationId) {
    return res.status(400).json({
      success: false,
      error: 'userEmail and conversationId are required',
    });
  }

  if (!isDatabaseConfigured()) {
    return res.json({
      success: true,
      messages: [],
      saved: false,
    });
  }

  try {
    const messages = await getConversationMessages(userEmail, conversationId);
    return res.json({
      success: true,
      conversationId,
      messages,
      saved: true,
    });
  } catch (error) {
    console.error('Legacy conversation history error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversation history',
    });
  }
});

router.delete('/chat/conversation', async (req, res) => {
  const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim() : '';
  const conversationId =
    typeof req.query.conversationId === 'string' ? req.query.conversationId.trim() : '';

  if (!userEmail || !conversationId) {
    return res.status(400).json({
      success: false,
      error: 'userEmail and conversationId are required',
    });
  }

  if (!isDatabaseConfigured()) {
    return res.json({
      success: true,
      deletedCount: 0,
      saved: false,
    });
  }

  try {
    const result = await deleteConversationMessages(userEmail, conversationId);
    return res.json({
      success: true,
      conversationId,
      deletedCount: result.deletedCount,
      saved: true,
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete conversation',
    });
  }
});

router.get('/health-updates', async (_req, res) => {
  try {
    const updates = await fetchHealthUpdates();
    return res.json({
      success: true,
      ...updates,
    });
  } catch (error) {
    console.error('Health updates error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health updates',
    });
  }
});

router.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : 'English';
  const conversationId =
    typeof req.body?.conversationId === 'string' && req.body.conversationId.trim()
      ? req.body.conversationId.trim()
      : randomUUID();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const user = req.body?.user && typeof req.body.user === 'object' ? req.body.user : null;
  const userEmail = typeof user?.email === 'string' ? user.email.trim() : null;
  const username = typeof user?.username === 'string' ? user.username.trim() : null;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required',
    });
  }

  if (!isGroqConfigured()) {
    return res.status(500).json({
      success: false,
      error: 'GROQ_API_KEY is not configured on the server',
    });
  }

  try {
    const reply = await generateHealthReply({
      message,
      language,
      history,
    });
    let suggestions = [];

    try {
      suggestions = await generateSuggestedReplies({
        language,
        userMessage: message,
        assistantReply: reply.content,
      });
    } catch (suggestionError) {
      console.error('Suggested replies error:', suggestionError);
    }

    let saved = false;
    if (isDatabaseConfigured() && userEmail) {
      await saveChatMessage({
        id: randomUUID(),
        conversationId,
        userEmail,
        username,
        role: 'user',
        language,
        content: message,
        metadata: {
          source: 'chat-ui',
        },
      });

      await saveChatMessage({
        id: randomUUID(),
        conversationId,
        userEmail,
        username,
        role: 'assistant',
        language,
        content: reply.content,
        model: reply.model,
        metadata: {
          source: 'chat-ui',
        },
      });

      saved = true;
    }

    return res.json({
      success: true,
      conversationId,
      reply: reply.content,
      model: reply.model,
      suggestions,
      saved,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Chat request failed',
    });
  }
});

router.post('/chat/translate-ui', async (req, res) => {
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : 'English';
  const copy = req.body?.copy;

  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
    return res.status(400).json({
      success: false,
      error: 'copy must be a JSON object',
    });
  }

  try {
    const translated = await translateUiCopy({
      targetLanguage: language,
      copy,
    });

    return res.json({
      success: true,
      language,
      copy: translated,
    });
  } catch (error) {
    console.error('UI translation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'UI translation failed',
    });
  }
});

export default router;
