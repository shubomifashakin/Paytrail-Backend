import { RequestHandler, Router } from "express";

import signInWithApple from "../controllers/authRouter/apple/signIn";

import signInWithGoogle from "../controllers/authRouter/google/signIn";
import signInWithGoogleCallback from "../controllers/authRouter/google/callback";
import signInWithGoogleToken from "../controllers/authRouter/google/token";
import signOut from "../controllers/authRouter/signOut";

import isAuthorized from "../middlewares/isAuthorized";

import asyncHandler from "../utils/asyncHandler";

function createAuthRouter(options: { signInRateLimiter: RequestHandler }) {
  const router = Router();

  router.post("/apple", asyncHandler(signInWithApple));
  router.get("/google", options.signInRateLimiter, asyncHandler(signInWithGoogle));
  router.get("/google/callback", asyncHandler(signInWithGoogleCallback));
  router.post("/google/token", asyncHandler(signInWithGoogleToken));

  router.post("/sign-out", isAuthorized, asyncHandler(signOut));

  return router;
}

export default createAuthRouter;
