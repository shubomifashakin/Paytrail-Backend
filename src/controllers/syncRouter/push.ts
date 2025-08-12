import { Request, Response } from "express";

import prisma from "../../lib/prisma";

import { MESSAGES } from "../../utils/constants";
import { pushSchemaValidator } from "../../utils/validators";

export default async function (req: Request, res: Response) {
  const body = req.body;

  if (!body) {
    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const { success, error, data } = pushSchemaValidator.safeParse(body);

  if (!success) {
    //FIXME: LOG ERROR
    return res.status(400).json({ message: error.issues });
  }

  await prisma.$transaction(
    data.data
      .map((c) => {
        if (c.tableName === "budgets" && c.operation === "insert") {
          return prisma.budgets.create({
            data: {
              id: c.id,
              amount: c.data.amount,
              year: c.data.year,
              budgetMonth: c.data.budgetMonth,
              currency: c.data.currency,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "budgets" && c.operation === "delete") {
          return prisma.budgets.delete({
            where: {
              id: c.id,
            },
          });
        }

        if (c.tableName === "budgets" && c.operation === "update") {
          return prisma.budgets.update({
            where: {
              id: c.id,
            },
            data: {
              id: c.id,
              amount: c.data.amount,
              year: c.data.year,
              budgetMonth: c.data.budgetMonth,
              currency: c.data.currency,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "categories" && c.operation === "insert") {
          return prisma.categories.create({
            data: {
              id: c.id,
              name: c.data.name,
              color: c.data.color,
              logType: c.data.logType,
              emoji: c.data.emoji,
              description: c.data.description,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "categories" && c.operation === "delete") {
          return prisma.categories.delete({
            where: {
              id: c.id,
            },
          });
        }

        if (c.tableName === "categories" && c.operation === "update") {
          return prisma.categories.update({
            where: {
              id: c.id,
            },
            data: {
              id: c.id,
              name: c.data.name,
              color: c.data.color,
              logType: c.data.logType,
              emoji: c.data.emoji,
              description: c.data.description,
              userId: c.data.userId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "payment_methods" && c.operation === "insert") {
          return prisma.paymentMethods.create({
            data: {
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

        if (c.tableName === "payment_methods" && c.operation === "delete") {
          return prisma.paymentMethods.delete({
            where: {
              id: c.id,
            },
          });
        }

        if (c.tableName === "payment_methods" && c.operation === "update") {
          return prisma.paymentMethods.update({
            where: {
              id: c.id,
            },
            data: {
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

        if (c.tableName === "logs" && c.operation === "insert") {
          return prisma.logs.create({
            data: {
              id: c.id,
              amount: c.data.amount,
              userId: c.data.userId,
              transactionDate: c.data.transactionDate,
              note: c.data.note,
              logType: c.data.logType,
              currency: c.data.currency,
              categoryId: c.data.categoryId,
              paymentMethodId: c.data.paymentMethodId,
              budgetId: c.data.budgetId,
              createdAt: c.data.createdAt,
              updatedAt: c.data.updatedAt,
            },
          });
        }

        if (c.tableName === "logs" && c.operation === "delete") {
          return prisma.logs.delete({
            where: {
              id: c.id,
            },
          });
        }

        if (c.tableName === "logs" && c.operation === "update") {
          return prisma.logs.update({
            where: {
              id: c.id,
            },
            data: {
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
