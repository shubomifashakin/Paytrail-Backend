import { NextFunction, Request, Response } from "express";

import prisma from "../lib/prisma";

import { MESSAGES } from "../utils/constants";

async function isAuthorized(req: Request, res: Response, next: NextFunction) {
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
}

export default isAuthorized;
