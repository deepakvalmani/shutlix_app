import mongoose from 'mongoose';

const conversationUnreadSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, default: 0 },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

conversationUnreadSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
conversationUnreadSchema.index({ userId: 1, organizationId: 1 });

export const ConversationUnread = mongoose.models.ConversationUnread || mongoose.model('ConversationUnread', conversationUnreadSchema);
