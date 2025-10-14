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
    
    if (snapshots.length >= 1) {
      for (const snapshot of snapshots) {
        // Use the stored daily views instead of calculating from differences
        // This prevents deletions from affecting historical data
        const dailyViews = snapshot.dailyTotalViews || 0;
        
        dailyViewsData.push({
          date: snapshot.date,
          views: dailyViews,
          fullDate: new Date(snapshot.date).toLocaleDateString('en-US', { 
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
        hasData: snapshots.length >= 1
      }
    });

  } catch (error) {
    console.error('[ANALYTICS ROUTE] Error:', error);
    return c.json({ success: false, message: 'Failed to fetch analytics' }, 500);
  }
});

export default app; 