import { Hono } from 'hono';
import settingsManager from '../services/settingsManager.js';
import AdminSettings from '../models/AdminSettings.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const app = new Hono();

// Get admin settings (directly from DB for admins)
app.post('/get', async (c) => {
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

    let dbSettings = await AdminSettings.findById('admin_settings');

    if (!dbSettings) {
      const defaultSettings = settingsManager.getDefaultSettings();
      dbSettings = await AdminSettings.create({
        _id: 'admin_settings',
        ...defaultSettings
      });
    }

    const settings = {
      blockedKeywords: dbSettings.blockedKeywords || [],
      adSettings: dbSettings.adSettings || settingsManager.getDefaultSettings().adSettings
    };

    return c.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('[ADMIN SETTINGS GET] Error:', error);
    return c.json({ success: false, message: 'Failed to fetch settings' }, 500);
  }
});

app.post('/update', async (c) => {
  try {
    const { token, settings } = await c.req.json();

    if (!token) {
      return c.json({ success: false, message: 'Token required' }, 401);
    }

    if (!settings) {
      return c.json({ success: false, message: 'Settings required' }, 400);
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

    // Update settings (updates both cache and database)
    const updatedSettings = await settingsManager.updateSettings(settings);

    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updatedSettings
    });

  } catch (error) {
    console.error('[ADMIN SETTINGS UPDATE] Error:', error);
    return c.json({ success: false, message: 'Failed to update settings' }, 500);
  }
});

// Get ad settings only (public endpoint - uses cache for performance)
app.get('/ads', async (c) => {
  try {
    // Get ad settings from cache (fast, no DB query - syncs every 30s)
    const adSettings = settingsManager.getAdSettings();

    // Ensure adSettings is valid or provide default
    const safeAdSettings = adSettings || {
      chaturbate1: { enabled: false, iframeUrl: '' },
      chaturbate2: { enabled: false, iframeUrl: '' },
      smartAd1: { enabled: false, iframeUrl: '' },
      smartAd2: { enabled: false, iframeUrl: '' },
      videoAd: { enabled: false, url: '' },
      popunderAd: { enabled: false, urls: [] },
      bannerAds: { enabled: false, ads: [] },
      undressButton: { enabled: true, text: 'Undress Her', url: 'https://pornworks.com/?refid=goonproject' }
    };

    return c.json({
      success: true,
      adSettings: safeAdSettings
    });

  } catch (error) {
    console.error('[ADMIN SETTINGS ADS] Error:', error);
    return c.json({ success: false, message: 'Failed to fetch ad settings' }, 500);
  }
});

export default app; 