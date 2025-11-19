import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import mongoose from "mongoose";
import { config } from "dotenv";
import { Server } from 'socket.io';
import VideoQueue from "./models/VideoQueue.js";
import { processOneById } from './services/queueProcessor.js';
import proxyManager from './services/proxyManager.js';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

config();

import signupRoute from "./routes/signup.js";
import signinRoute from "./routes/signin.js";
import deleteUserRoute from "./routes/deleteUser.js";
import verifyRoute from "./routes/verify.js";
import resendRoute from "./routes/resend.js";
import resetPassRoute from "./routes/resetPass.js";
import resetVerifyRoute from "./routes/resetVerify.js";
import resetDoneRoute from "./routes/resetDone.js";
import checkRoute from "./routes/check.js";
import profileRoute from "./routes/profile.js";
import uploadVideoRoute from "./routes/uploadVideo.js";
import uploadImageRoute from "./routes/uploadImage.js";
import requestVideoUploadUrlRoute from "./routes/requestVideoUploadUrl.js";
import completeVideoUploadRoute from "./routes/completeVideoUpload.js";
import videoRoute from "./routes/video.js";
import imageRoute from "./routes/image.js";
import contentRoute from "./routes/content.js";
import interactionsRoute from "./routes/interactions.js";
import updateBioRoute from "./routes/updateBio.js";
import updateAvatarRoute from "./routes/updateAvatar.js";
import updateAvatarColorRoute from "./routes/updateAvatarColor.js";
import updateUsernameRoute from "./routes/updateUsername.js";
import discoverRoute from "./routes/discover.js";
import discoverImagesRoute from "./routes/discoverImages.js";
import deleteContentRoute from "./routes/deleteContent.js";
import searchRoute from "./routes/search.js";
import relatedRoute from "./routes/related.js";
import recommendedRoute from "./routes/recommended.js";
import commentsRoute from "./routes/comments.js";
import reportsRoute from "./routes/reports.js";
import googleAuthRoute from "./routes/googleAuth.js";
import analyticsRoute from "./routes/analytics.js";
import analyticsManager from "./services/analyticsManager.js";
import adminSettingsRoute from "./routes/adminSettings.js";
import settingsManager from "./services/settingsManager.js";
import userManagementRoute, { setBanIO } from "./routes/userManagement.js";
import adminDataRoute from "./routes/adminData.js";
import conversationsRoute, { setIO as setConversationsIO } from "./routes/chat/conversations.js";
import messagesRoute from "./routes/chat/messages.js";
import userProfileRoute, { setUserProfileIO } from "./routes/chat/userProfile.js";
import statusRoute, { setStatusIO } from "./routes/chat/status.js";
import muteRoute, { setMuteIO } from "./routes/chat/mute.js";
import notificationPreferenceRoute from "./routes/chat/notificationPreference.js";
import acceptRulesRoute from "./routes/acceptRules.js";
import { initializeChatSocket } from "./services/socketHandler.js";

const app = new Hono();

app.use("*", cors());

const dbUrl = process.env.DATABASE_URL;
mongoose.connect(dbUrl)
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });

const port = process.env.PORT || 3001;

app.get("/", (c) => c.text("Hello World!"));
app.route('/api/signup', signupRoute);
app.route('/api/signup/verify', verifyRoute);
app.route('/api/signup/resend', resendRoute);
app.route('/api/signin', signinRoute);
app.route('/api/google-auth', googleAuthRoute);
app.route('/api/resetpass', resetPassRoute);
app.route('/api/resetpass/verify', resetVerifyRoute);
app.route('/api/deleteuser', deleteUserRoute);
app.route('/api/resetdone', resetDoneRoute);
app.route('/api/check', checkRoute);
app.route('/api/profile', profileRoute);
app.route('/api/uploadVideo', uploadVideoRoute);
app.route('/api/uploadImage', uploadImageRoute);
app.route('/api/requestVideoUploadUrl', requestVideoUploadUrlRoute);
app.route('/api/completeVideoUpload', completeVideoUploadRoute);
app.route('/api/video', videoRoute);
app.route('/api/image', imageRoute);
app.route('/api/content', contentRoute);
app.route('/api/interactions', interactionsRoute);
app.route('/api/updateBio', updateBioRoute);
app.route('/api/updateAvatar', updateAvatarRoute);
app.route('/api/updateAvatarColor', updateAvatarColorRoute);
app.route('/api/updateUsername', updateUsernameRoute);
app.route('/api/discover', discoverRoute);
app.route('/api/discoverImages', discoverImagesRoute);
app.route('/api/delete', deleteContentRoute);
app.route('/api/search', searchRoute);
app.route('/api/related', relatedRoute);
app.route('/api/recommended', recommendedRoute);
app.route('/api/comments', commentsRoute);
app.route('/api/reports', reportsRoute);
app.route('/api/analytics', analyticsRoute);
app.route('/api/admin/settings', adminSettingsRoute);
app.route('/api/admin/users', userManagementRoute);
app.route('/api/admin/data', adminDataRoute);
app.route('/api/chat/conversations', conversationsRoute);
app.route('/api/chat/messages', messagesRoute);
app.route('/api/chat/profile', userProfileRoute);
app.route('/api/chat/status', statusRoute);
app.route('/api/chat/mute', muteRoute);
app.route('/api/chat/notification-preference', notificationPreferenceRoute);
app.route('/api/accept-rules', acceptRulesRoute);

app.get('/api/queue', async (c) => {
    try {
        const [queue, totalCount] = await Promise.all([
            VideoQueue.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(50),
            VideoQueue.countDocuments()
        ]);
        return c.json({ success: true, queue, totalCount });
    } catch (error) {
        return c.json({ success: false, message: 'Failed to fetch queue' }, 500);
    }
});


const server = serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize chat socket handlers
initializeChatSocket(io);

// Pass io to routes for broadcasting
setConversationsIO(io);
setStatusIO(io);
setUserProfileIO(io);
setMuteIO(io);
setBanIO(io);

const memoryQueue = [];
let isProcessing = false;
let isProxyChecking = false;

async function broadcastQueue() {
    try {
        io.emit('queue:update', await VideoQueue.find().sort({ createdAt: -1 }));
    } catch (e) {
        console.error('Failed to broadcast queue:', e.message);
    }
}

async function tryProcessNext() {
    if (isProcessing || isProxyChecking) return;
    const nextId = memoryQueue.shift();
    if (!nextId) return;
    isProcessing = true;
    try {
        await processOneById(nextId);
    } catch (e) {
        console.error('Processing error:', e.message);
    } finally {
        isProcessing = false;
        setImmediate(tryProcessNext);
    }
}

async function bootstrapQueue() {
    try {
        // Reset any stuck items and rebuild the memory queue
        await VideoQueue.updateMany(
            { status: { $in: ['processing', 'downloading', 'uploading'] } },
            { $set: { status: 'queued' } }
        );
        const queued = await VideoQueue.find({ status: 'queued' }).sort({ createdAt: 1 });
        memoryQueue.length = 0;
        for (const v of queued) memoryQueue.push(v._id);
        await broadcastQueue();
        tryProcessNext();
    } catch (e) {
        console.error('Bootstrap queue failed:', e.message);
    }
}

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('queue:add', async (data) => {
        try {
            const { link, destination, token } = data;
            if (!link || !destination || !token) {
                return socket.emit('queue:error', 'Missing link, destination, or token.');
            }

            let decoded;
            try {
                decoded = jwt.verify(token, JWT_SECRET);
            } catch (error) {
                return socket.emit('queue:error', 'Invalid or expired token.');
            }

            const user = await User.findOne({ email: decoded.email });
            if (!user) {
                return socket.emit('queue:error', 'User not found.');
            }

            const newVideo = new VideoQueue({ link, destination, queuedBy: user._id, userToken: token });
            await newVideo.save();

            io.emit('queue:added', { _id: newVideo._id.toString(), link: newVideo.link, status: newVideo.status, destination: newVideo.destination });

            memoryQueue.push(newVideo._id);
            await broadcastQueue();
            tryProcessNext();
        } catch (error) {
            console.error('Error adding to queue:', error);
            socket.emit('queue:error', 'Failed to add video to the queue.');
        }
    });

    socket.on('queue:remove', async (id) => {
        try {
            if (id.toString().startsWith('temp-')) {
                return;
            }

            const v = await VideoQueue.findById(id);
            if (!v) return;

            if (v.status === 'queued') {
                await VideoQueue.findByIdAndDelete(id);
                const idx = memoryQueue.findIndex(x => x.toString() === id.toString());
                if (idx !== -1) memoryQueue.splice(idx, 1);
                io.emit('queue:removed', id.toString());
                await broadcastQueue();
            } else {
                socket.emit('queue:error', 'Cannot remove an item that has already started.');
            }
        } catch (error) {
            console.error('Error removing from queue:', error);
            socket.emit('queue:error', 'Failed to remove video from the queue.');
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

proxyManager.start({
    onCheckStart: () => {
        console.log('[ORCHESTRATOR] Pausing queue processing for proxy check.');
        isProxyChecking = true;
    },
    onCheckEnd: () => {
        console.log('[ORCHESTRATOR] Resuming queue processing after proxy check.');
        isProxyChecking = false;
        setImmediate(tryProcessNext);
    }
}).then(bootstrapQueue);

settingsManager.start();

analyticsManager.start();

export { server, io, proxyManager, analyticsManager, settingsManager };
