import Queue from "bull";
import envLoader from "../config/envLoader.js";

const REDIS_URL = envLoader.redisUrl;
const QUEUE_NAME = envLoader.bullQueueName;

// Export a factory so both server and worker can create the queue object.
export function createQueue() {
  return new Queue(QUEUE_NAME, REDIS_URL);
}
