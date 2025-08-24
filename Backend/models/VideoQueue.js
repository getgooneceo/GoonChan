import mongoose from 'mongoose';

const videoQueueSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'downloading', 'uploading', 'waiting'],
    default: 'queued',
  },
  videoUrl: {
    type: String,
  },
  filePath: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  retries: {
    type: Number,
    default: 0
  },
  destination: {
    type: String,
    enum: ['goonchan', 'goonvideos', 'both'],
    required: true,
  },
  queuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userToken: {
    type: String,
    required: true,
  }
}, { timestamps: true });

const VideoQueue = mongoose.models.VideoQueue || mongoose.model('VideoQueue', videoQueueSchema);

export default VideoQueue; 