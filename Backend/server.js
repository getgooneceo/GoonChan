import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import mongoose from "mongoose";
import { config } from "dotenv";

config();

import signupRoute from "./routes/signup.js";
import signinRoute from "./routes/signin.js";
import deleteUserRoute from "./routes/deleteUser.js";

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
app.route('/api/signin', signinRoute);
app.route('/api/deleteuser', deleteUserRoute);
console.log(`Server running at http://localhost:${port}`);

export { server };
