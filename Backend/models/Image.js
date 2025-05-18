import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
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
  likeCount: { type: Number, default: 0 },
  dislikeCount: { type: Number, default: 0 },
  tags: { type: [String], default: [] }
}, { timestamps: true });

ImageSchema.index({ title: 'text', description: 'text', tags: 'text' });

ImageSchema.index({ uploader: 1 });
ImageSchema.index({ views: -1 });
ImageSchema.index({ uploadDate: -1 });

const Image = mongoose.model('Image', ImageSchema);

export default Image;