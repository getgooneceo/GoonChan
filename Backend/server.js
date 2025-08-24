import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import mongoose from "mongoose";
import { config } from "dotenv";
import { Server } from 'socket.io';
import VideoQueue from "./models/VideoQueue.js";
import { startQueueProcessor } from './services/queueProcessor.js';
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
import videoRoute from "./routes/video.js";
import imageRoute from "./routes/image.js";
import contentRoute from "./routes/content.js";
import interactionsRoute from "./routes/interactions.js";
import updateBioRoute from "./routes/updateBio.js";
import updateAvatarRoute from "./routes/updateAvatar.js";
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
app.route('/api/video', videoRoute);
app.route('/api/image', imageRoute);
app.route('/api/content', contentRoute);
app.route('/api/interactions', interactionsRoute);
app.route('/api/updateBio', updateBioRoute);
app.route('/api/updateAvatar', updateAvatarRoute);
app.route('/api/updateUsername', updateUsernameRoute);
app.route('/api/discover', discoverRoute);
app.route('/api/discoverImages', discoverImagesRoute);
app.route('/api/delete', deleteContentRoute);
app.route('/api/search', searchRoute);
app.route('/api/related', relatedRoute);
app.route('/api/recommended', recommendedRoute);
app.route('/api/comments', commentsRoute);
app.route('/api/reports', reportsRoute);

app.get('/api/queue', async (c) => {
    try {
        const queue = await VideoQueue.find().sort({ createdAt: -1 });
        return c.json({ success: true, queue });
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
            const fullQueue = await VideoQueue.find().sort({ createdAt: -1 });
            io.emit('queue:update', fullQueue);
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
            await VideoQueue.findByIdAndDelete(id);
            const fullQueue = await VideoQueue.find().sort({ createdAt: -1 });
            io.emit('queue:update', fullQueue);
        } catch (error) {
            console.error('Error removing from queue:', error);
            socket.emit('queue:error', 'Failed to remove video from the queue.');
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

startQueueProcessor();

export { server, io };
