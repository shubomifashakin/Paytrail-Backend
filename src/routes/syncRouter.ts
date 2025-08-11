import { Router } from "express";
import isAuthorized from "src/middlewares/isAuthorized";

import asyncHandler from "../utils/asyncHandler";

import pull from "../controllers/syncRouter/pull";
import push from "../controllers/syncRouter/push";

const syncRouter = Router();

syncRouter.get("/pull", isAuthorized, asyncHandler(pull));
syncRouter.post("/push", isAuthorized, asyncHandler(push));

export default syncRouter;
