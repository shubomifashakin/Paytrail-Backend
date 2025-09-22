import { RedisClientType } from "redis";
import { Router } from "express";

import getAllBroadcasts from "../controllers/broadcastsRouter/getBroadcasts";

import createRateLimiter from "../middlewares/rateLimiter";

import asyncHandler from "../utils/asyncHandler";

export default function createBroadcastsRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.get(
    "/",
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(getAllBroadcasts),
  );

  return router;
}
