import { Hono } from 'hono';
import Analytics from '../models/Analytics.js';
import AdminSettings from '../models/AdminSettings.js';
import User from '../models/User.js';
import Video from '../models/Video.js';
import Image from '../models/Image.js';
import settingsManager from '../services/settingsManager.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

// Unified GET endpoint for all admin data
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

    // Fetch all data in parallel for performance
    const [
      totalUsers,
      totalVideos,
      totalImages,
      videoViewsSum,
      imageViewsSum,
      snapshots,
      dbSettings,
      bannedUsers,
      adminUsers
    ] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      Image.countDocuments(),
      Video.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Image.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Analytics.find().sort({ date: 1 }).lean(),
      AdminSettings.findById('admin_settings'),
      User.find({ isBanned: true, isDummy: false })
        .select('_id username email avatar avatarColor')
        .lean(),
      User.find({ isAdmin: true, isDummy: false })
        .select('_id username email avatar avatarColor')
        .lean()
    ]);

    // Process analytics data
    const videoViews = videoViewsSum[0]?.total || 0;
    const imageViews = imageViewsSum[0]?.total || 0;
    const totalViews = videoViews + imageViews;

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

    // Process settings data
    let settings;
    if (!dbSettings) {
      const defaultSettings = settingsManager.getDefaultSettings();
      const newSettings = await AdminSettings.create({
        _id: 'admin_settings',
        ...defaultSettings
      });
      settings = {
        blockedKeywords: newSettings.blockedKeywords || [],
        adSettings: newSettings.adSettings || defaultSettings.adSettings
      };
    } else {
      settings = {
        blockedKeywords: dbSettings.blockedKeywords || [],
        adSettings: dbSettings.adSettings || settingsManager.getDefaultSettings().adSettings
      };
    }

    // Return unified response
    return c.json({
      success: true,
      data: {
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
        },
        settings,
        userManagement: {
          bannedUsers,
          adminUsers
        }
      }
    });

  } catch (error) {
    console.error('[ADMIN DATA] Error:', error);
    return c.json({ success: false, message: 'Failed to fetch admin data' }, 500);
  }
});

export default app; 