import { RequestHandler, Router } from "express";

import signInWithApple from "../controllers/authRouter/apple/signIn";

import signInWithGoogle from "../controllers/authRouter/google/signIn";
import signInWithGoogleCallback from "../controllers/authRouter/google/callback";
import signInWithGoogleToken from "../controllers/authRouter/google/token";

import asyncHandler from "../utils/asyncHandler";

function createAuthRouter(options?: { signInRateLimiter?: RequestHandler }) {
  const router = Router();

  const googleMiddlewares = [options?.signInRateLimiter, asyncHandler(signInWithGoogle)].filter(
    Boolean,
  ) as RequestHandler[];

  router.post("/apple", asyncHandler(signInWithApple));
  router.get("/google", ...googleMiddlewares);
  router.get("/google/callback", asyncHandler(signInWithGoogleCallback));
  router.post("/google/token", asyncHandler(signInWithGoogleToken));

  return router;
}

export default createAuthRouter;
