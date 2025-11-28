import "dotenv/config";
import envLoader from "./config/envLoader.js";

import express from "express";
import http from "http";
import { Server as IOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import IORedis from "ioredis";
import { connectDB } from "./lib/db.js";
import ingestRoute from "./routes/ingest.js";
import Aggregate from "./models/Aggregate.js";

const PORT = envLoader.port;
const REDIS_URL = envLoader.redisUrl;
const REDIS_PUBSUB_CHANNEL = envLoader.redisPubSubChannel;

async function start() {
  await connectDB();

  const app = express();

  // serve /public
  app.use(express.static("public"));
  const server = http.createServer(app);

  // middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  app.use(morgan("dev"));

  // routes
  app.use("/api/data", ingestRoute);

  // statistics route — read latest aggregate(s) from MongoDB
  app.get("/api/data/stats", async (req, res) => {
    try {
      // support query param key (e.g., ?key=global)
      const key = req.query.key || "global";
      const agg = await Aggregate.findOne({ key }).lean();
      if (!agg) return res.json({ key, count: 0, sum: 0, avg: 0 });
      return res.json(agg);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "failed to fetch stats" });
    }
  });

  // Setup Socket.io
  const io = new IOServer(server, {
    path: "/ws",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const wsNamespace = io.of("/ws");

  wsNamespace.on("connection", (socket) => {
    console.log("WS connected", socket.id);

    // optionally allow client to subscribe to a key
    const subscribedKey = socket.handshake.query.key || "global";
    socket.join(subscribedKey);

    // Listen for messages from the worker
    socket.on("worker:jobCompleted", (data) => {
      console.log("Forwarding worker update:", data);
      // Broadcast to all clients in the room (or just emit to all)
      wsNamespace.to(subscribedKey).emit("stats:updates", data);
      // Optional: also emit to everyone regardless of room
      wsNamespace.emit("stats:updates:all", data);
    });

    socket.on("disconnect", (reason) => {
      console.log("WS disconnected", socket.id, reason);
    });
  });

  // Redis subscriber listens for worker published updates and broadcasts to Socket.io clients
  const redisSub = new IORedis(REDIS_URL);

  redisSub.subscribe(REDIS_PUBSUB_CHANNEL, (err, count) => {
    if (err) {
      console.error("Failed to subscribe to Redis channel", err);
    } else {
      console.log(`Subscribed to ${REDIS_PUBSUB_CHANNEL}`);
    }
  });

  redisSub.on("message", (channel, message) => {
    if (channel !== REDIS_PUBSUB_CHANNEL) return;
    try {
      const payload = JSON.parse(message);
      const { key, aggregate } = payload; // worker publishes { key, aggregate }
      // Broadcast to that room (key) and also emit generic event
      wsNamespace.to(key).emit("stats:update", aggregate);
      wsNamespace.emit("stats:update:all", { key, aggregate });
    } catch (err) {
      console.error("Invalid pubsub message", err);
    }
  });

  server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
