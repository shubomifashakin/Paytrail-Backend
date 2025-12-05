import { NextFunction, Request, Response } from "express";

import prisma from "../lib/prisma";

import { MESSAGES } from "../utils/constants";
import { logUnauthenticatedWarning } from "../utils/fns";

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

  if (!session) {
    logUnauthenticatedWarning({
      req,
      reason: MESSAGES.UNAUTHORIZED,
      message: MESSAGES.UNAUTHORIZED,
    });

    return res.status(401).json({ message: MESSAGES.UNAUTHORIZED });
  }

  req.user = session.user;
  return next();
}

export default isAuthorized;
