import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  // Up to two link previews captured at send-time for fast loads
  previews: [
    new mongoose.Schema({
      url: { type: String, required: true },
      domain: { type: String },
      siteName: { type: String },
      title: { type: String },
      description: { type: String },
      image: { type: String },
      icon: { type: String }
    }, { _id: false })
  ],
  editedAt: { type: Date, default: null },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

const Message = mongoose.model('Message', MessageSchema);

export default Message;
