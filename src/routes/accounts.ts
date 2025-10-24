import { RedisClientType } from "redis";
import { Router } from "express";

import createRateLimiter from "../middlewares/rateLimiter";

import asyncHandler from "../utils/asyncHandler";
import deleteUserAccount from "../controllers/accountsRouter/deleteAccount";

export default function createAccountRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.delete(
    "/me",
    createRateLimiter({
      redisClient,
      limit: 3,
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(deleteUserAccount),
  );

  return router;
}
