import { Request, Response } from "express";

import prisma from "../../lib/prisma";

import { MESSAGES } from "../../utils/constants";

import { logAuthenticatedError } from "../../utils/fns";
import { userDetailsValidator } from "../../utils/validators";

export default async function deleteUserAccount(req: Request, res: Response) {
  const body = req.body;

  const { success, data, error } = userDetailsValidator.safeParse(body);

  if (!success) {
    logAuthenticatedError({
      req,
      reason: error.issues,
      message: MESSAGES.BAD_REQUEST,
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
