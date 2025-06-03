import mongoose from 'mongoose';

export const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

export const generateRandomSuffix = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const ImageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  slug: { type: String, required: true, unique: true, trim: true },
  imageUrls: { type: [String], required: true, validate: [arr => arr.length > 0, 'At least one image URL is required'] },
  thumbnailIndex: { type: Number, default: 0, validate: {
    validator: function(value) {
      return value >= 0 && value < this.imageUrls.length;
    },
    message: props => `${props.value} is not a valid index for the imageUrls array`
  }},
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: { type: [String], default: [] },
  hotness: { type: Number, default: 0, index: true },
}, { timestamps: true });

ImageSchema.methods.calculateHotness = function() {
  const upvotes = this.likedBy.length;
  const downvotes = this.dislikedBy.length;
  const netScore = upvotes - downvotes;
  const views = this.views;

  const adjustedScore = netScore + (views * 0.01);
  
  const order = Math.log10(Math.max(Math.abs(adjustedScore), 1));
  const sign = adjustedScore > 0 ? 1 : (adjustedScore < 0 ? -1 : 0);
  
  const uploadTime = Math.floor(this.uploadDate.getTime() / 1000);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - uploadTime; // timeDiff is in seconds

  const logarithmicTimeDecay = Math.log10(timeDiff + 1) / 55; 
  console.log(`Calculating hotness for image ${this._id}: upvotes=${upvotes}, downvotes=${downvotes}, views=${views}, adjustedScore=${adjustedScore}, order=${order}, sign=${sign}, timeDiff=${timeDiff}, hotness=${sign * order - logarithmicTimeDecay}`);
  return sign * order - logarithmicTimeDecay;
};

ImageSchema.pre('save', function(next) {
  if (this.isModified('likedBy') || this.isModified('dislikedBy') || this.isModified('views') || this.isNew) {
    this.hotness = this.calculateHotness();
  }
  next();
});

ImageSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await doc.populate('likedBy dislikedBy');
    const updatedDoc = await this.model.findById(doc._id);
    if (updatedDoc) {
      updatedDoc.hotness = updatedDoc.calculateHotness();
      await updatedDoc.save();
    }
  }
});

ImageSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'contentId',
  match: { contentType: 'image' }
});

ImageSchema.set('toJSON', { virtuals: true });
ImageSchema.set('toObject', { virtuals: true });

ImageSchema.index({ title: 'text', description: 'text', tags: 'text' });
ImageSchema.index({ uploader: 1 });
ImageSchema.index({ views: -1 });
ImageSchema.index({ uploadDate: -1 });
ImageSchema.index({ hotness: -1 });

const Image = mongoose.model('Image', ImageSchema);

export default Image;