import { Request, Response } from "express";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";

import { MESSAGES } from "../../utils/constants";

import { normalizeRequestPath } from "../../utils/fns";
import { userDetailsValidator } from "../../utils/validators";

export default async function deleteUserAccount(req: Request, res: Response) {
  const body = req.body;

  const { success, data, error } = userDetailsValidator.safeParse(body);

  if (!success) {
    logger.warn(`${MESSAGES.BAD_REQUEST}`, {
      issues: error.issues,
      ipAddress: req.ip,
      userId: req.user.id,
      requestId: req.headers["request-id"],
      path: normalizeRequestPath(req),
      userAgent: req.get("user-agent"),
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      name: data.name,
    },
  });

  return res.status(200).json({ message: "Success" });
}
