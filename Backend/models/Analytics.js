import mongoose from 'mongoose';

const AnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  totalViews: { type: Number, required: true, default: 0 },
  totalUsers: { type: Number, required: true, default: 0 },
  totalVideos: { type: Number, required: true, default: 0 },
  totalImages: { type: Number, required: true, default: 0 },
  videoViews: { type: Number, required: true, default: 0 },
  imageViews: { type: Number, required: true, default: 0 },
  dailyVideoViews: { type: Number, default: 0 },
  dailyImageViews: { type: Number, default: 0 },
  dailyTotalViews: { type: Number, default: 0 }
}, { timestamps: true });

// Index for efficient querying
AnalyticsSchema.index({ date: -1 });

const Analytics = mongoose.model('Analytics', AnalyticsSchema);

export default Analytics; 