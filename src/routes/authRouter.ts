import { Router } from "express";

import signInWithApple from "../controllers/authRouter/apple/signIn";
import signInWithGoogle from "../controllers/authRouter/google/signIn";
import signInWithGoogleCallback from "../controllers/authRouter/google/callback";
import signInWithGoogleToken from "../controllers/authRouter/google/token";

import asyncHandler from "../utils/asyncHandler";

const authRouter = Router();

authRouter.post("/apple", asyncHandler(signInWithApple));

authRouter.get("/google", asyncHandler(signInWithGoogle));
authRouter.get("/google/callback", asyncHandler(signInWithGoogleCallback));
authRouter.post("/google/token", asyncHandler(signInWithGoogleToken));

export default authRouter;
