import { Request, Response } from "express";

import prisma from "../../lib/prisma";

export default async function (req: Request, res: Response) {
  const lastPullDate = (req.query.lastPullDate as string) || null;

  const whereClause = lastPullDate
    ? { updatedAt: { gte: new Date(lastPullDate) }, userId: req.user.id }
    : { userId: req.user.id };

  //find everything from the database newer than the last pull date
  const [logs, categories, paymentMethods, budgets] = await prisma.$transaction([
    prisma.logs.findMany({
      where: whereClause,
    }),
    prisma.categories.findMany({
      where: whereClause,
    }),
    prisma.paymentMethods.findMany({
      where: whereClause,
    }),
    prisma.budgets.findMany({
      where: whereClause,
    }),
  ]);

  return res.status(200).json({
    data: { logs, budgets, categories, paymentMethods },
    serverTime: new Date().toISOString(),
  });
}
