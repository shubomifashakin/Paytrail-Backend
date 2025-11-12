/* eslint-disable sort-imports */
import { RedisClientType } from "redis";
import { Router } from "express";

import asyncHandler from "../utils/asyncHandler";

import getRate from "../controllers/ratesRouter/getRates";

import isAuthorized from "../middlewares/isAuthorized";
import createRateLimiter from "../middlewares/rateLimiter";

export default function ratesRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.get(
    "/",
    isAuthorized,
    createRateLimiter({ redisClient, limit: 5, window: 10 }),
    asyncHandler(getRate({ redisClient })),
  );

  return router;
}
