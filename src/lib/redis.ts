import { RedisClientType, createClient } from "redis";

import logger from "./logger";

import serverEnv from "../serverEnv";

const redisClient = createClient({
  url: serverEnv.redis,
})
  .on("ready", () => logger.info("Redis connection ready"))
  .on("end", () => logger.info("Redis connection closed"))
  .on("error", (error) => {
    logger.error(`Redis connection error: ${error?.message}`, error);
  }) as RedisClientType;

export default redisClient;
