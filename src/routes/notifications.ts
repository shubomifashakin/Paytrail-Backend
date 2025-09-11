import { Router } from "express";

import registerForPushNotifications from "../controllers/notificationsRouter/registerForPushNotifications";

import asyncHandler from "../utils/asyncHandler";
import getAllUserNotifications from "../controllers/notificationsRouter/getAllUserNotifications";

const notificationRouter = Router();

notificationRouter.get("/", asyncHandler(getAllUserNotifications));
notificationRouter.post("/register", asyncHandler(registerForPushNotifications));

export default notificationRouter;
