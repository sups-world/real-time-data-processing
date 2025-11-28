const envLoader = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGO_URI || null,
  redisUrl: process.env.REDIS_URL || null,
  bullQueueName: process.env.BULL_QUEUE_NAME || null,
  redisPubSubChannel: process.env.REDIS_PUBSUB_CHANNEL || null,
  concurrency: process.env.CONCURRENCY || null,
  nodeEnv: process.env.NODE_ENV || "development",
};

export default envLoader;
