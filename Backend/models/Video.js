import mongoose from 'mongoose';

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  videoUrl: { type: String, required: true },
  thumbnail: { type: String, required: true },
  duration: { type: String, required: true },
  views: { type: Number, default: 0 },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
  likeCount: { type: Number, default: 0 },
  dislikeCount: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
}, { timestamps: true });


VideoSchema.index({ title: 'text', description: 'text', tags: 'text' });

VideoSchema.index({ uploader: 1 });
VideoSchema.index({ views: -1 });
VideoSchema.index({ uploadDate: -1 });
VideoSchema.index({ isPublic: 1 });

const Video = mongoose.model('Video', VideoSchema);

export default Video;