import { RedisClientType } from "redis";
import { Router } from "express";

import getAllUserNotifications from "../controllers/notificationsRouter/getAllUserNotifications";
import registerForPushNotifications from "../controllers/notificationsRouter/registerForPushNotifications";
import unregisterForPushNotifications from "../controllers/notificationsRouter/unregisterForPushNotifications";

import createRateLimiter from "../middlewares/rateLimiter";

import asyncHandler from "../utils/asyncHandler";

export default function createNotificationRouter({
  redisClient,
}: {
  redisClient: RedisClientType;
}) {
  const router = Router();

  router.get(
    "/",
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(getAllUserNotifications),
  );

  router.post(
    "/devices",
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(registerForPushNotifications),
  );

  router.delete(
    "/devices",
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    asyncHandler(unregisterForPushNotifications),
  );

  return router;
}
