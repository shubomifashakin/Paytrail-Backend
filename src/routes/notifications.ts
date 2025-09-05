import { Router } from "express";

import registerForPushNotifications from "../controllers/notificationsRouter/registerForPushNotifications";

import asyncHandler from "../utils/asyncHandler";

const notificationRouter = Router();

notificationRouter.post("/register", asyncHandler(registerForPushNotifications));

export default notificationRouter;
