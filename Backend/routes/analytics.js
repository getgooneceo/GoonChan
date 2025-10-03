import { Hono } from 'hono';
import Analytics from '../models/Analytics.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Image from '../models/Image.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

app.post('/', async (c) => {
  try {
    const { token } = await c.req.json();

    if (!token) {
      return c.json({ success: false, message: 'Token required' }, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return c.json({ success: false, message: 'Invalid token' }, 401);
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user || !user.isAdmin) {
      return c.json({ success: false, message: 'Unauthorized' }, 403);
    }

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

    const snapshots = await Analytics.find().sort({ date: 1 }).lean();

    const dailyViewsData = [];
    
    if (snapshots.length >= 2) {
      for (let i = 1; i < snapshots.length; i++) {
        const previous = snapshots[i - 1];
        const current = snapshots[i];
        
        const dailyViews = current.totalViews - previous.totalViews;
        
        dailyViewsData.push({
          date: current.date,
          views: Math.max(0, dailyViews),
          fullDate: new Date(current.date).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
      }
    }

    return c.json({
      success: true,
      analytics: {
        totals: {
          users: totalUsers,
          videos: totalVideos,
          images: totalImages,
          views: totalViews,
          videoViews,
          imageViews
        },
        dailyViews: dailyViewsData,
        hasData: snapshots.length >= 2
      }
    });

  } catch (error) {
    console.error('[ANALYTICS ROUTE] Error:', error);
    return c.json({ success: false, message: 'Failed to fetch analytics' }, 500);
  }
});

export default app; 