import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import mongoose from "mongoose";
import { config } from "dotenv";

config();

// import { ChatBot } from "./routes/response.js";

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
// app.route('/api/response', responseRoute)

console.log(`Server running at http://localhost:${port}`);

export { server };
