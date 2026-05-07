import mongoose from 'mongoose';

const LostAndFoundSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  item: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  shuttleId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['reported', 'found', 'claimed', 'returned'],
    default: 'reported',
  },
  category: {
    type: String,
    enum: ['electronics', 'bags', 'wallet', 'clothing', 'other'],
    default: 'other'
  },
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: true,
  },
  location: {
    type: String,
  },
  image: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const LostAndFound = mongoose.models.LostAndFound || mongoose.model('LostAndFound', LostAndFoundSchema);
