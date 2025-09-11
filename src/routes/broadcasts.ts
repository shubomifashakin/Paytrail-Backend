import { Router } from "express";

import getAllBroadcasts from "../controllers/broadcastsRouter/getBroadcasts";

import asyncHandler from "../utils/asyncHandler";

const broadcatsRouter = Router();

broadcatsRouter.get("/", asyncHandler(getAllBroadcasts));

export default broadcatsRouter;
