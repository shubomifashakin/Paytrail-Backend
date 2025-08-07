import { NextFunction, Request, Response } from "express";

import logger from "../lib/logger";
import prisma from "../lib/prisma";

import { MESSAGES } from "../utils/constants";

async function isAuthorized(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers["authorization"]?.split(" ")[1];

    if (!sessionId) {
      return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
    }

    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
    }

    req.user = session.user;
    return next();
  } catch (error) {
    logger.error("Failed to authenticate user", error, {
      requestId: req.headers["request-id"],
      ipAddress: req.ip,
      sessionId: req.headers["authorization"]?.split(" ")[1],
    });

    return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  }
}

export default isAuthorized;
