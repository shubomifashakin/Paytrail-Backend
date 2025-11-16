import { RedisClientType } from "redis";
import { Router } from "express";

import signInWithApple from "../controllers/authRouter/apple/signIn";

import restoreAccount from "../controllers/authRouter/restoreAccount";
import signInWithGoogle from "../controllers/authRouter/google/signIn";
import signInWithGoogleCallback from "../controllers/authRouter/google/callback";
import signInWithGoogleToken from "../controllers/authRouter/google/token";
import signOut from "../controllers/authRouter/signOut";

import createRateLimiter from "../middlewares/rateLimiter";
import isAuthorized from "../middlewares/isAuthorized";

import asyncHandler from "../utils/asyncHandler";

function createAuthRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.post(
    "/apple/authorize",
    createRateLimiter({ redisClient, limit: 5, window: 30 }),
    asyncHandler(signInWithApple),
  );

  router.get(
    "/google/authorize",
    createRateLimiter({ redisClient, limit: 5, window: 60 }),
    asyncHandler(signInWithGoogle),
  );
  router.get("/google/callback", asyncHandler(signInWithGoogleCallback));
  router.post("/google/token", asyncHandler(signInWithGoogleToken));

  router.post(
    "/restore",
    createRateLimiter({ redisClient, limit: 5, window: 60 }),
    asyncHandler(restoreAccount),
  );

  router.post("/sign-out", isAuthorized, asyncHandler(signOut));

  return router;
}

export default createAuthRouter;
