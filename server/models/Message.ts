import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  attachments: [{
    type: { type: String, enum: ['image', 'file'] },
    url: String,
    name: String,
    size: Number
  }],
  isSystem: { type: Boolean, default: false }
}, { timestamps: true });

// Message indexing for pagination and retrieval
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: 1 });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
