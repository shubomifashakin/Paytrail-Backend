import { NextFunction, Request, Response } from "express";

import { User } from "@prisma/client";

import auth from "../lib/auth";
import logger from "../lib/logger";

import { MESSAGES } from "../utils/constants";

//checks if theres a valid session for the user that made the request
async function isAuthorized(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as unknown as Headers });

    if (!session) {
      return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
    }

    req.user = session.user as User;
    return next();
  } catch (error) {
    logger.error("Failed to authenticate user", error);
    return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  }
}

export default isAuthorized;
