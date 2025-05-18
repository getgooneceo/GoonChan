import mongoose from 'mongoose';

const ReplySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, default: 'https://i.pravatar.cc/150?img=1' },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'contentType' },
  contentType: { type: String, enum: ['video', 'image'], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, default: 'https://i.pravatar.cc/150?img=1' },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  replies: [ReplySchema],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });


CommentSchema.index({ contentType: 1, contentId: 1 });
CommentSchema.index({ user: 1 });
CommentSchema.index({ createdAt: -1 });
CommentSchema.index({ likes: -1 });

const Comment = mongoose.model('Comment', CommentSchema);

export default Comment;
