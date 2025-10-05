import mongoose from 'mongoose';

const AdminSettingsSchema = new mongoose.Schema({
  // There will only be one document in this collection
  _id: { type: String, default: 'admin_settings' },
  
  blockedKeywords: {
    type: [String],
    default: []
  },

  adSettings: {
    chaturbate1: {
      enabled: { type: Boolean, default: false },
      iframeUrl: { type: String, default: '' }
    },
    chaturbate2: {
      enabled: { type: Boolean, default: false },
      iframeUrl: { type: String, default: '' }
    },
    smartAd1: {
      enabled: { type: Boolean, default: false },
      iframeUrl: { type: String, default: '' }
    },
    smartAd2: {
      enabled: { type: Boolean, default: false },
      iframeUrl: { type: String, default: '' }
    },
    videoAd: {
      enabled: { type: Boolean, default: false },
      url: { type: String, default: '' }
    },
    popunderAd: {
      enabled: { type: Boolean, default: false },
      urls: { type: [String], default: [] }
    },
    bannerAds: {
      enabled: { type: Boolean, default: false },
      ads: [{
        link: { type: String, default: '' },
        gif: { type: String, default: '' }
      }]
    },
    undressButton: {
      enabled: { type: Boolean, default: true },
      text: { type: String, default: 'Undress Her' },
      url: { type: String, default: 'https://pornworks.com/?refid=goonproject' }
    }
  }
}, { timestamps: true });

const AdminSettings = mongoose.model('AdminSettings', AdminSettingsSchema);

export default AdminSettings; 