import { Router } from "express";

import { RedisClientType } from "redis";

import createRateLimiter from "../middlewares/rateLimiter";
import isAuthorized from "../middlewares/isAuthorized";

import asyncHandler from "../utils/asyncHandler";

import pull from "../controllers/syncRouter/pull";
import push from "../controllers/syncRouter/push";

export default function createSyncRouter({ redisClient }: { redisClient: RedisClientType }) {
  const syncRouter = Router();

  syncRouter.get(
    "/pull",
    isAuthorized,
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 10,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(pull),
  );

  syncRouter.post(
    "/push",
    isAuthorized,
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 10 * 10,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(push),
  );

  return syncRouter;
}
