import { NextFunction, Request, Response } from "express";

import prisma from "../lib/prisma";

import { logUnauthenticatedWarning } from "../utils/fns";
import { MESSAGES, SESSION_EXPIRY_MS } from "../utils/constants";

async function isAuthorized(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers["authorization"]?.split(" ")[1];

  if (!sessionId) {
    logUnauthenticatedWarning({
      req,
      reason: MESSAGES.UNAUTHORIZED,
      message: MESSAGES.UNAUTHORIZED,
    });

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

  if (!session || new Date() > session.expiresAt) {
    logUnauthenticatedWarning({
      req,
      reason: MESSAGES.UNAUTHORIZED,
      message: MESSAGES.UNAUTHORIZED,
    });

    return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  }

  const now = new Date();
  const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;
  const timeUntilExpiry = session.expiresAt.getTime() - now.getTime();

  if (timeUntilExpiry < fourDaysInMs) {
    const newExpiry = new Date(now.getTime() + SESSION_EXPIRY_MS);
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: newExpiry },
    });
  }

  req.user = session.user;
  return next();
}

export default isAuthorized;
