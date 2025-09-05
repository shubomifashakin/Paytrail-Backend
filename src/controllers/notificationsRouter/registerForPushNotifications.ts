import { Request, Response } from "express";

import prisma from "../../lib/prisma";

export default async function registerForPushNotifications(req: Request, res: Response) {
  const userId = req.user.id;

  const body = req.body;

  if (!body.pushToken) {
    //FIXME: LOG ERROR
    return res.status(400).json({ message: "Missing push token" });
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      deviceToken: body.pushToken,
    },
  });

  return res.status(200).json({ message: "success" });
}
