import mongoose from 'mongoose';

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateRandomSuffix = (length = 6) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  slug: { type: String, unique: true },
  videoUrl: { type: String, required: true },
  thumbnail: { type: String, required: true },
  duration: { type: Number, required: true },
  views: { type: Number, default: 0 },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: { type: [String], default: [] },
  cloudflareStreamId: { type: String, required: true, unique: true, sparse: true },
}, { timestamps: true });

VideoSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'contentId',
  match: { contentType: 'video' }
});

VideoSchema.set('toJSON', { virtuals: true });
VideoSchema.set('toObject', { virtuals: true });

VideoSchema.index({ title: 'text', description: 'text', tags: 'text' });
VideoSchema.index({ uploader: 1 });
VideoSchema.index({ views: -1 });
VideoSchema.index({ uploadDate: -1 });

const Video = mongoose.model('Video', VideoSchema);

export { generateSlug, generateRandomSuffix };
export default Video;