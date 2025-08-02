import { Router } from "express";

import { getHealthStatus } from "../controllers/healthRouter/getHealthStatus";

import asyncHandler from "../utils/asyncHandler";

const healthRouter = Router();

healthRouter.get("/", asyncHandler(getHealthStatus));

export default healthRouter;
