import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import Reminder from '../models/Reminder.js';

function getMongoUri() {
  return (
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_DB_URI ||
    ''
  );
}

export function isDatabaseConfigured() {
  return Boolean(getMongoUri());
}

export async function initializeDatabase() {
  if (!isDatabaseConfigured()) {
    return { connected: false, reason: 'MONGO_URI is not set' };
  }

  await ChatMessage.init();
  await User.init();
  await Reminder.init();
  return { connected: mongoose.connection.readyState === 1 };
}

export async function getDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return { connected: false, reason: 'MONGO_URI is not set' };
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      return { connected: false, reason: 'MongoDB connection is not ready' };
    }

    await mongoose.connection.db.admin().command({ ping: 1 });
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      reason: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

export async function saveChatMessage({
  id,
  conversationId,
  userEmail = null,
  username = null,
  role,
  language = 'English',
  content,
  model = null,
  metadata = {},
}) {
  if (!isDatabaseConfigured() || mongoose.connection.readyState !== 1) {
    return null;
  }

  const message = await ChatMessage.create({
    id,
    conversationId,
    userEmail,
    username,
    role,
    language,
    content,
    model,
    metadata,
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    userEmail: message.userEmail,
    username: message.username,
    role: message.role,
    language: message.language,
    content: message.content,
    model: message.model,
    createdAt: message.createdAt,
  };
}

export async function getRecentConversations(userEmail, limit = 10) {
  if (!userEmail || !isDatabaseConfigured() || mongoose.connection.readyState !== 1) {
    return [];
  }

  const messages = await ChatMessage.aggregate([
    {
      $match: {
        userEmail,
        role: 'user',
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: '$conversationId',
        preview: { $first: '$content' },
        language: { $first: '$language' },
        updatedAt: { $first: '$createdAt' },
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        conversationId: '$_id',
        preview: 1,
        language: 1,
        updatedAt: 1,
      },
    },
  ]);

  return messages;
}

export async function getConversationMessages(userEmail, conversationId) {
  if (!userEmail || !conversationId || !isDatabaseConfigured() || mongoose.connection.readyState !== 1) {
    return [];
  }

  const messages = await ChatMessage.find({
    userEmail,
    conversationId,
  })
    .sort({ createdAt: 1 })
    .lean();

  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    userEmail: message.userEmail,
    username: message.username,
    role: message.role,
    language: message.language,
    content: message.content,
    model: message.model,
    createdAt: message.createdAt,
  }));
}

export async function deleteConversationMessages(userEmail, conversationId) {
  if (!userEmail || !conversationId || !isDatabaseConfigured() || mongoose.connection.readyState !== 1) {
    return { deletedCount: 0 };
  }

  const result = await ChatMessage.deleteMany({
    userEmail,
    conversationId,
  });

  return {
    deletedCount: result.deletedCount || 0,
  };
}
