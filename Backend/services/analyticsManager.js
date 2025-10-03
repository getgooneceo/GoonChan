import Analytics from '../models/Analytics.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Image from '../models/Image.js';

class AnalyticsManager {
  constructor() {
    this.checkInterval = null;
    this.checkIntervalMs = 60 * 60 * 1000; // Check every hour
  }

  async getCurrentStats() {
    try {
      const [totalUsers, totalVideos, totalImages, videoViewsSum, imageViewsSum] = await Promise.all([
        User.countDocuments(),
        Video.countDocuments(),
        Image.countDocuments(),
        Video.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
        Image.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }])
      ]);

      const videoViews = videoViewsSum[0]?.total || 0;
      const imageViews = imageViewsSum[0]?.total || 0;
      const totalViews = videoViews + imageViews;

      return {
        totalUsers,
        totalVideos,
        totalImages,
        totalViews,
        videoViews,
        imageViews
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting current stats:', error);
      throw error;
    }
  }

  async checkAndSaveSnapshot() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const existingSnapshot = await Analytics.findOne({ date: todayStart });
      
      if (existingSnapshot) {
        console.log('[ANALYTICS] Snapshot for today already exists, skipping...');
        return;
      }

      const lastSnapshot = await Analytics.findOne().sort({ date: -1 });

      if (!lastSnapshot) {
        console.log('[ANALYTICS] Creating first snapshot...');
        const stats = await this.getCurrentStats();
        await Analytics.create({
          date: todayStart,
          ...stats
        });
        console.log('[ANALYTICS] First snapshot created successfully');
        return;
      }

      const lastSnapshotDate = new Date(lastSnapshot.date);
      const hoursSinceLastSnapshot = (now - lastSnapshotDate) / (1000 * 60 * 60);

      if (hoursSinceLastSnapshot >= 24) {
        console.log('[ANALYTICS] 24+ hours since last snapshot, creating new one...');
        const stats = await this.getCurrentStats();
        await Analytics.create({
          date: todayStart,
          ...stats
        });
        console.log('[ANALYTICS] New snapshot created successfully');
      } else {
        console.log(`[ANALYTICS] Only ${hoursSinceLastSnapshot.toFixed(1)} hours since last snapshot, waiting...`);
      }
    } catch (error) {
      console.error('[ANALYTICS] Error in checkAndSaveSnapshot:', error);
    }
  }

  async start() {
    console.log('[ANALYTICS] Starting analytics manager...');

    await this.checkAndSaveSnapshot();

    this.checkInterval = setInterval(() => {
      this.checkAndSaveSnapshot();
    }, this.checkIntervalMs);
    
    console.log('[ANALYTICS] Analytics manager started, checking every hour');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[ANALYTICS] Analytics manager stopped');
    }
  }
}

const analyticsManager = new AnalyticsManager();

export default analyticsManager; 