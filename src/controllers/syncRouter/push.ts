import { Request, Response } from "express";

import prisma from "../../lib/prisma";

import { pushSchemaValidator } from "../../utils/validators";

export default async function (req: Request, res: Response) {
  const { success, error, data } = pushSchemaValidator.safeParse(req?.body);

  if (!success) {
    //FIXME: LOG ERROR
    return res.status(400).json({ message: error.issues });
  }

  await prisma.$transaction(
    data.data
      .map((c) => {
        if (c.tableName === "budgets" && c.operation === "delete") {
          return prisma.budgets.deleteMany({
            where: {
              id: c.id,
            },
          });
        }

        if (c.tableName === "budgets" && (c.operation === "update" || c.operation === "insert")) {
          return prisma.budgets.upsert({
            create: {
              id: c.id,
              amount: c.data.amount,
              year: c.data.year,
              budgetMonth: c.data.budgetMonth,
              currency: c.data.currency,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
              period:c.data.period
            },
            where: {
              id: c.id,
            },
            update: {
              id: c.id,
              amount: c.data.amount,
              year: c.data.year,
              budgetMonth: c.data.budgetMonth,
              currency: c.data.currency,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
              period:c.data.period
            },
          });
        }

        if (c.tableName === "categories" && c.operation === "delete") {
          return prisma.categories.deleteMany({
            where: {
              id: c.id,
            },
          });
        }

        if (
          c.tableName === "categories" &&
          (c.operation === "update" || c.operation === "insert")
        ) {
          return prisma.categories.upsert({
            where: {
              id: c.id,
            },
            create: {
              id: c.id,
              name: c.data.name,
              color: c.data.color,
              emoji: c.data.emoji,
              description: c.data.description,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
            update: {
              id: c.id,
              name: c.data.name,
              color: c.data.color,
              emoji: c.data.emoji,
              description: c.data.description,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "payment_methods" && c.operation === "delete") {
          return prisma.paymentMethods.deleteMany({
            where: {
              id: c.id,
            },
          });
        }

        if (
          c.tableName === "payment_methods" &&
          (c.operation === "update" || c.operation === "insert")
        ) {
          return prisma.paymentMethods.upsert({
            where: {
              id: c.id,
            },
            create: {
              id: c.id,
              name: c.data.name,
              color: c.data.color,
              description: c.data.description,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
            update: {
              id: c.id,
              name: c.data.name,
              color: c.data.color,
              description: c.data.description,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "logs" && c.operation === "delete") {
          return prisma.logs.deleteMany({
            where: {
              id: c.id,
            },
          });
        }

        if (c.tableName === "logs" && (c.operation === "update" || c.operation === "insert")) {
          return prisma.logs.upsert({
            where: {
              id: c.id,
            },
            create: {
              id: c.id,
              amount: c.data.amount,
              transactionDate: c.data.transactionDate,
              note: c.data.note,
              logType: c.data.logType,
              currency: c.data.currency,
              categoryId: c.data.categoryId,
              userId: c.data.userId,
              paymentMethodId: c.data.paymentMethodId,
              budgetId: c.data.budgetId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
            update: {
              id: c.id,
              amount: c.data.amount,
              transactionDate: c.data.transactionDate,
              note: c.data.note,
              logType: c.data.logType,
              currency: c.data.currency,
              categoryId: c.data.categoryId,
              userId: c.data.userId,
              paymentMethodId: c.data.paymentMethodId,
              budgetId: c.data.budgetId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        return null;
      })
      .filter((item) => item !== null),
  );

  return res.status(200).json({ serverTime: new Date().toISOString() });
}
