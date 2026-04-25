/**
 * Re-export all Mongoose models for serverless functions.
 * Uses mongoose.models cache to prevent "Cannot overwrite model" errors.
 */
import mongoose from 'mongoose';

// ---------- ChatMessage ----------
const ChatMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    userEmail: { type: String, default: null, index: true },
    username: { type: String, default: null },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    language: { type: String, default: 'English' },
    content: { type: String, required: true },
    model: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ChatMessageSchema.index({ userEmail: 1, createdAt: -1 });
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

// ---------- Graph ----------
const GraphSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  graph: { type: Object, required: true },
  metadata: { type: Object },
  userEmail: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
});

export const Graph = mongoose.models.Graph || mongoose.model('Graph', GraphSchema);

// ---------- Reminder ----------
const reminderSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  label: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Reminder =
  mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

// ---------- User ----------
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    age: { type: String, required: true },
    gender: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
