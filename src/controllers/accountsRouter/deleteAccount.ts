import { Request, Response } from "express";

import prisma from "../../lib/prisma";

export async function deleteUserAccount(req: Request, res: Response) {
  //FIXME: UNSUBSCRIBE USER FROM SNS TOPIC IF USER WAS SUBSCRUBED

  await prisma.user.delete({
    where: {
      id: req.user.id,
    },
  });

  return res.status(200).json({ message: "User deleted" });
}
