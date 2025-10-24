import { Router } from "express";

import isAuthorized from "../middlewares/isAuthorized";

import asyncHandler from "../utils/asyncHandler";
import deleteUserAccount from "../controllers/accountsRouter/deleteAccount";

export default function createAccountRouter() {
  const router = Router();

  router.delete("/me", isAuthorized, asyncHandler(deleteUserAccount));

  return router;
}
