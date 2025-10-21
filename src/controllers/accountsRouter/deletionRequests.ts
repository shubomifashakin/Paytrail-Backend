import { Request, Response } from "express";

import prisma from "../../lib/prisma";

import { z } from "zod";

const requestDeleteSchema = z.object({
  email: z.email({ error: "Invalid email" }),
});

export default async function handleGoogleFormRequestDelete(req: Request, res: Response) {
  const body = req.body;

  const { data, success, error } = requestDeleteSchema.safeParse(body);

  if (!success) {
    return res.status(400).json({ message: error.message });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    return res.status(200).json({ message: "Success" });
  }

  await prisma.user.delete({
    where: {
      email: data.email,
    },
  });

  return res.status(200).json({ message: "Success" });
}
