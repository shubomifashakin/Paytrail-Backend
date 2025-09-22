import { RedisClientType } from "redis";
import { Router } from "express";

import createRateLimiter from "../middlewares/rateLimiter";
import requestStatement from "../controllers/statementRouter/requestStatement";

export default function createStatementRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.post(
    "/",
    createRateLimiter({
      redisClient,
      limit: 10,
      window: 10 * 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    requestStatement,
  );

  return router;
}
