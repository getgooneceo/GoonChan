import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import mongoose from "mongoose";
import { config } from "dotenv";

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

const app = new Hono();

app.use("*", cors());

const dbUrl = process.env.DATABASE_URL;
mongoose.connect(dbUrl);

const port = process.env.PORT || 3001;

const server = serve({
  fetch: app.fetch,
  port,
});

app.get("/", (c) => c.text("Hello World!"));
app.route('/api/signup', signupRoute);
app.route('/api/signup/verify', verifyRoute);
app.route('/api/signup/resend', resendRoute);
app.route('/api/signin', signinRoute);
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
console.log(`Server running at http://localhost:${port}`);

export { server };
