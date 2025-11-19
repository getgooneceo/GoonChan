import mongoose from 'mongoose';

const generateUrlId = () => {
  return Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
};

const ConversationSchema = new mongoose.Schema({
  urlId: { type: String, unique: true, default: generateUrlId },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String, default: null },
  groupAvatar: { type: String, default: null },
  groupAvatarColor: { type: String, default: null },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 },
    mentionsCount: { type: Number, default: 0 } // Track mentions separately
  }],
  // Notification preferences per user: 'all' | 'mentions' | 'nothing'
  notificationPreferences: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    preference: { type: String, enum: ['all', 'mentions', 'nothing'], default: 'all' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster queries
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
ConversationSchema.index({ lastMessageAt: -1 });
// urlId is declared with `unique: true` in the schema above which creates an index.
// Avoid declaring a duplicate index here to prevent Mongoose duplicate index warnings.

const Conversation = mongoose.model('Conversation', ConversationSchema);

export default Conversation;
