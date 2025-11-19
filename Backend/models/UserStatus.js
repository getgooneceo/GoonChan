import mongoose from 'mongoose';

const UserStatusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['online', 'offline', 'away', 'dnd'], default: 'offline' },
  customStatus: { type: String, default: '' },
  lastSeen: { type: Date, default: Date.now },
  socketIds: [{ type: String }], // Track multiple connections
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster queries
UserStatusSchema.index({ status: 1 });
// Note: `user` is declared with `unique: true` in the schema above, which creates an index.
// We intentionally avoid calling `index({ user: 1 })` here to prevent duplicate index warnings from Mongoose.

const UserStatus = mongoose.model('UserStatus', UserStatusSchema);

export default UserStatus;
