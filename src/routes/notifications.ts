import { Router } from "express";

import getAllNotifications from "../controllers/notificationsRouter/allNotifications";
import registerForPushNotifications from "../controllers/notificationsRouter/registerForPushNotifications";

import asyncHandler from "../utils/asyncHandler";

const notificationRouter = Router();

notificationRouter.get("/", asyncHandler(getAllNotifications));
notificationRouter.post("/register", asyncHandler(registerForPushNotifications));

export default notificationRouter;
