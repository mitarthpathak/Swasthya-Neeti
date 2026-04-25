import mongoose from 'mongoose';

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

export default mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
