import { Request, Response } from "express";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";

import { MESSAGES } from "../../utils/constants";
import { normalizeRequestPath } from "../../utils/fns";
import { pushSchemaValidator } from "../../utils/validators";

export default async function (req: Request, res: Response) {
  const { success, error, data } = pushSchemaValidator.safeParse(req?.body);

  if (!success) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      path: normalizeRequestPath(req),
      error: error.issues,
      requestId: req.headers["request-id"],
    });

    return res.status(400).json({ message: error.issues });
  }

  await prisma.$transaction(async (tx) => {
    for (const c of data.data) {
      if (c.tableName === "budgets" && c.operation === "delete") {
        const exists = await tx.budgets.findUnique({
          where: {
            id: c.data.id,
          },
        });

        if (!exists) continue;

        await tx.budgets.delete({
          where: {
            id: c.data.id,
          },
        });
      }

      if (c.tableName === "budgets" && (c.operation === "update" || c.operation === "insert")) {
        const latest = await tx.budgets.findUnique({
          where: {
            id: c.data.id,
          },
          select: {
            updatedAt: true,
          },
        });

        if (latest && latest?.updatedAt > new Date(c.data.updatedAt)) {
          continue;
        }

        await tx.budgets.upsert({
          create: {
            id: c.data.id,
            amount: c.data.amount,
            year: c.data.year,
            budgetMonth: c.data.budgetMonth,
            currency: c.data.currency,
            userId: c.data.userId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
            period: c.data.period,
          },
          where: {
            id: c.data.id,
          },
          update: {
            id: c.data.id,
            amount: c.data.amount,
            year: c.data.year,
            budgetMonth: c.data.budgetMonth,
            currency: c.data.currency,
            userId: c.data.userId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
            period: c.data.period,
          },
        });
      }

      if (c.tableName === "categories" && c.operation === "delete") {
        const exists = await tx.categories.findUnique({
          where: {
            id: c.data.id,
          },
        });

        if (!exists) continue;

        await tx.categories.delete({
          where: {
            id: c.data.id,
          },
        });
      }

      if (c.tableName === "categories" && (c.operation === "update" || c.operation === "insert")) {
        const latest = await tx.categories.findUnique({
          where: {
            id: c.data.id,
          },
          select: {
            updatedAt: true,
          },
        });

        if (latest && latest?.updatedAt > new Date(c.data.updatedAt)) {
          continue;
        }

        await tx.categories.upsert({
          where: {
            id: c.data.id,
          },
          create: {
            id: c.data.id,
            name: c.data.name,
            color: c.data.color,
            emoji: c.data.emoji,
            description: c.data.description,
            userId: c.data.userId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
          },
          update: {
            id: c.data.id,
            name: c.data.name,
            color: c.data.color,
            emoji: c.data.emoji,
            description: c.data.description,
            userId: c.data.userId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
          },
        });
      }

      if (c.tableName === "payment_methods" && c.operation === "delete") {
        const exists = await tx.paymentMethods.findUnique({ where: { id: c.data.id } });

        if (!exists) continue;

        await tx.paymentMethods.delete({
          where: {
            id: c.data.id,
          },
        });
      }

      if (
        c.tableName === "payment_methods" &&
        (c.operation === "update" || c.operation === "insert")
      ) {
        const latest = await tx.paymentMethods.findUnique({
          where: {
            id: c.data.id,
          },
          select: {
            updatedAt: true,
          },
        });

        if (latest && latest?.updatedAt > new Date(c.data.updatedAt)) {
          continue;
        }

        await tx.paymentMethods.upsert({
          where: {
            id: c.data.id,
          },
          create: {
            id: c.data.id,
            name: c.data.name,
            color: c.data.color,
            description: c.data.description,
            emoji: c.data.emoji,
            userId: c.data.userId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
          },
          update: {
            id: c.data.id,
            name: c.data.name,
            color: c.data.color,
            description: c.data.description,
            userId: c.data.userId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
          },
        });
      }

      if (c.tableName === "transactions" && c.operation === "delete") {
        const exists = await tx.transactions.findUnique({ where: { id: c.data.id } });

        if (!exists) continue;

        await tx.transactions.delete({
          where: {
            id: c.data.id,
          },
        });
      }

      if (
        c.tableName === "transactions" &&
        (c.operation === "update" || c.operation === "insert")
      ) {
        const latest = await tx.transactions.findUnique({
          where: {
            id: c.data.id,
          },
          select: {
            updatedAt: true,
          },
        });

        if (latest && latest?.updatedAt > new Date(c.data.updatedAt)) {
          continue;
        }

        await tx.transactions.upsert({
          where: {
            id: c.data.id,
          },
          create: {
            id: c.data.id,
            amount: c.data.amount,
            transactionDate: new Date(c.data.transactionDate),
            note: c.data?.note || "",
            transactionType: c.data.transactionType,
            currency: c.data.currency,
            categoryId: c.data.categoryId,
            userId: c.data.userId,
            paymentMethodId: c.data.paymentMethodId,
            budgetId: c.data.budgetId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
          },
          update: {
            id: c.data.id,
            amount: c.data.amount,
            transactionDate: new Date(c.data.transactionDate),
            note: c.data?.note || "",
            transactionType: c.data.transactionType,
            currency: c.data.currency,
            categoryId: c.data.categoryId,
            userId: c.data.userId,
            paymentMethodId: c.data.paymentMethodId,
            budgetId: c.data.budgetId,
            createdAt: new Date(c.data.createdAt),
            updatedAt: new Date(c.data.updatedAt),
          },
        });
      }
    }
    return null;
  });

  return res.status(200).json({ serverTime: new Date().toISOString() });
}
