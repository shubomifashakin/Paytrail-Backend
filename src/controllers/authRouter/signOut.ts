import { Request, Response } from "express";

import prisma from "../../lib/prisma";

import { MESSAGES } from "../../utils/constants";

export default async function signOut(req: Request, res: Response) {
  const sessionId = req.headers["authorization"]?.split(" ")[1];

  await prisma.session.delete({
    where: {
      id: sessionId,
    },
  });

  return res.status(200).json({ message: MESSAGES.SUCCESS });
}
