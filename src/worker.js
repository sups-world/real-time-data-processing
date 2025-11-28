import "dotenv/config";
import envLoader from "./config/envLoader.js";
import { createQueue } from "./lib/queue.js";
import IORedis from "ioredis";
import { connectDB } from "./lib/db.js";
import Aggregate from "./models/Aggregate.js";
import DataPoint from "./models/DataPoint.js"; // optional raw storage
import ProcessedRecord from "./models/ProcessedRecord.js";

import { io as Client } from "socket.io-client";

const REDIS_URL = envLoader.redisUrl;
const REDIS_PUBSUB_CHANNEL = envLoader.redisPubSubChannel;
const QUEUE = createQueue();
const CONCURRENCY = parseInt(envLoader.concurrency || "4", 10);

// Connect to your server's /ws namespace
const socket = Client("http://localhost:3000/ws", {
  path: "/ws",
  query: { key: "global" }, // optional
});

// helper to safely update aggregate with atomic Mongo operation
async function updateAggregateAtomic(key, value) {
  // We'll increment count and sum atomically, compute average after.
  const result = await Aggregate.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1, sum: value },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  // compute avg
  result.avg = result.sum / result.count;
  await result.save(); // persist avg
  return result.toObject();
}

// set up Redis publisher client for pub/sub
const redisPub = new IORedis(REDIS_URL);

async function start() {
  await connectDB();

  // define Bull processor
  QUEUE.process("process-data", CONCURRENCY, async (job) => {
    const data = job.data; // { value, type, meta }

    // 1) Basic validation & transformation
    if (!data || typeof data.value !== "number" || Number.isNaN(data.value)) {
      // throw to let Bull handle retries / failed logging
      throw new Error("Invalid data.value");
    }
    const value = Number(data.value);

    // 2) (Optional) persist raw data for auditing / historical analyses
    try {
      // Keep raw storage optional for IO cost in high throughput environments
      if (process.env.SAVE_RAW === "true") {
        await DataPoint.create({
          value,
          type: data.type,
          meta: data.meta || {},
        });
      }
    } catch (err) {
      // log but continue
      console.error("Failed to save raw datapoint", err);
    }

    // 3) Update centralized aggregate (atomic)
    const key = data.key || "global";
    const aggregate = await updateAggregateAtomic(key, value);

    // 4) Store processed record in MongoDB (history)
    try {
      await ProcessedRecord.create({
        value: value, // transformed value (currently same as input)
        original: data, // entire incoming job payload
        processedAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to save processed history record", err);
    }

    // 5) Publish the updated aggregate to Redis pub/sub for server to broadcast
    const payload = JSON.stringify({ key, aggregate });
    await redisPub.publish(REDIS_PUBSUB_CHANNEL, payload);

    // done
    return aggregate;
  });

  // event listeners for visibility
  QUEUE.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed successfully !!!`);
    // Emit to server
    socket.emit("worker:jobCompleted", {
      jobId: job.id,
      value: job.data.value, // or result if you want processed stats
    });
  });

  QUEUE.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });

  console.log("Worker is listening for jobs with concurrency", CONCURRENCY);
}

start().catch((err) => {
  console.error("Worker failed to start", err);
  process.exit(1);
});
