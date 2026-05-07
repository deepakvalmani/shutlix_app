import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  type: { type: String, enum: ['dm', 'group', 'global'], default: 'dm' },
  name: String, // Only for groups
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
}, { timestamps: true });

// Prevent duplicate global chats per organization
conversationSchema.index({ organizationId: 1, type: 1 }, { 
  unique: true, 
  partialFilterExpression: { type: 'global' } 
});

// Optimize searching for user's conversations
conversationSchema.index({ organizationId: 1, participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
