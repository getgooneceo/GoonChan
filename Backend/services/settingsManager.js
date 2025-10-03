import AdminSettings from '../models/AdminSettings.js';

class SettingsManager {
  constructor() {
    this.cachedSettings = null;
    this.syncInterval = null;
    this.syncIntervalMs = 30 * 1000; // Sync every 30 seconds
    this.lastSync = null;
  }

  getDefaultSettings() {
    return {
      blockedKeywords: [],
      adSettings: {
        chaturbate1: { enabled: false, iframeUrl: '' },
        chaturbate2: { enabled: false, iframeUrl: '' },
        smartAd1: { enabled: false, iframeUrl: '' },
        smartAd2: { enabled: false, iframeUrl: '' },
        videoAd: { enabled: false, url: '' },
        popunderAd: { enabled: false, urls: [] },
        bannerAds: { enabled: false, ads: [] }
      }
    };
  }

  async initialize() {
    try {
      
      let settings = await AdminSettings.findById('admin_settings');

      if (!settings) {
        console.log('[SETTINGS] No settings found, creating default settings...');
        settings = await AdminSettings.create({
          _id: 'admin_settings',
          ...this.getDefaultSettings()
        });
      }
      
      this.cachedSettings = {
        blockedKeywords: settings.blockedKeywords || [],
        adSettings: settings.adSettings || this.getDefaultSettings().adSettings
      };
      
      this.lastSync = new Date();
      
      return this.cachedSettings;
    } catch (error) {
      console.error('[SETTINGS] Error initializing settings:', error);
      this.cachedSettings = this.getDefaultSettings();
      return this.cachedSettings;
    }
  }

  getSettings() {
    if (!this.cachedSettings) {
      console.warn('[SETTINGS] Settings not initialized, returning defaults');
      return this.getDefaultSettings();
    }
    return this.cachedSettings;
  }

  getAdSettings() {
    const settings = this.getSettings();
    return settings.adSettings;
  }

  getBlockedKeywords() {
    const settings = this.getSettings();
    return settings.blockedKeywords;
  }

  async updateSettings(newSettings) {
    try {
      console.log('[SETTINGS] Updating settings...');
      
      const updated = await AdminSettings.findByIdAndUpdate(
        'admin_settings',
        {
          blockedKeywords: newSettings.blockedKeywords,
          adSettings: newSettings.adSettings
        },
        { new: true, upsert: true }
      );
      
      // Update cache
      this.cachedSettings = {
        blockedKeywords: updated.blockedKeywords,
        adSettings: updated.adSettings
      };
      
      this.lastSync = new Date();
      console.log('[SETTINGS] Settings updated successfully');
      
      return this.cachedSettings;
    } catch (error) {
      console.error('[SETTINGS] Error updating settings:', error);
      throw error;
    }
  }

  async syncWithDatabase() {
    try {
      const settings = await AdminSettings.findById('admin_settings');
      
      if (settings) {
        this.cachedSettings = {
          blockedKeywords: settings.blockedKeywords || [],
          adSettings: settings.adSettings || this.getDefaultSettings().adSettings
        };
        this.lastSync = new Date();
      }
    } catch (error) {
      console.error('[SETTINGS] Error syncing with database:', error);
    }
  }

  startPeriodicSync() {
    if (this.syncInterval) {
      return;
    }

    this.syncInterval = setInterval(() => {
      this.syncWithDatabase();
    }, this.syncIntervalMs);

  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async start() {
    await this.initialize();
    this.startPeriodicSync();
  }

  stop() {
    this.stopPeriodicSync();
    console.log('[SETTINGS] Settings manager stopped');
  }

  getStatus() {
    return {
      isInitialized: this.cachedSettings !== null,
      lastSync: this.lastSync,
      syncInterval: this.syncIntervalMs
    };
  }
}

const settingsManager = new SettingsManager();

export default settingsManager; 