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
  hotness: { type: Number, default: 0, index: true },
}, { timestamps: true });

VideoSchema.methods.calculateHotness = function() {
  const upvotes = this.likedBy.length;
  const downvotes = this.dislikedBy.length;
  const netScore = upvotes - downvotes;
  const views = this.views;

  const adjustedScore = netScore + (views * 0.01);
  
  const order = Math.log10(Math.max(Math.abs(adjustedScore), 1));
  const sign = adjustedScore > 0 ? 1 : (adjustedScore < 0 ? -1 : 0);
  
  const uploadTime = Math.floor(this.uploadDate.getTime() / 1000);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - uploadTime;
  
  return sign * order + (timeDiff / 45000);
};

VideoSchema.pre('save', function(next) {
  if (this.isModified('likedBy') || this.isModified('dislikedBy') || this.isModified('views') || this.isNew) {
    this.hotness = this.calculateHotness();
  }
  next();
});

VideoSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();

  if (update && !Array.isArray(update)) {
    if (update.$push?.likedBy || update.$pull?.likedBy || 
        update.$push?.dislikedBy || update.$pull?.dislikedBy ||
        update.$addToSet?.likedBy || update.$addToSet?.dislikedBy) {

      this.setUpdate({ ...update, $set: { ...update.$set, needsHotnessUpdate: true } });
    }
  }
  next();
});

VideoSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.needsHotnessUpdate) {
    doc.hotness = doc.calculateHotness();
    await doc.save();
  }
});

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
VideoSchema.index({ hotness: -1 });

const Video = mongoose.model('Video', VideoSchema);

export { generateSlug, generateRandomSuffix };
export default Video;