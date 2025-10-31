import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { Request, Response } from "express";

import serverEnv from "../../serverEnv";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import sqsClient from "../../lib/sqsClient";

import { MESSAGES } from "../../utils/constants";
import { pushSchemaValidator } from "../../utils/validators";

import { Transactions } from "@prisma/client";

export default async function (req: Request, res: Response) {
  const { success, error, data } = pushSchemaValidator.safeParse(req?.body);

  if (!success) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      url: req.url,
      userId: req.user.id,
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

      if (c.tableName === "user" && c.operation === "update") {
        await tx.user.update({
          where: {
            id: c.data.id,
          },
          data: {
            currency: c.data.currency,
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

  res.status(200).json({ serverTime: new Date().toISOString() });

  try {
    logger.info("Sending transactions to transaction ingestion queue");

    const allValidTransactions = data.data
      .filter((c) => c.tableName === "transactions")
      ?.filter((c) => c.operation === "insert" || c.operation === "update");

    if (!allValidTransactions.length) return;

    const transactionsById = allValidTransactions.reduce(
      (acc, transaction) => {
        const transactionData = transaction.data as Transactions;

        if (!acc.has(transactionData.id)) {
          acc.set(transactionData.id, []);
        }
        acc.get(transactionData.id)?.push(transactionData);
        return acc;
      },
      new Map() as Map<string, Transactions[]>,
    );

    //since a transaction can be updated multiple times in a batch, we only want the most recent version of each transaction
    const uniqueTransactions = Array.from(transactionsById.values()).map((transaction) => {
      return transaction.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
    });

    const allTransactionsWithinPeriod = uniqueTransactions.filter((transaction) => {
      const now = new Date();

      const beginningOfCurrentMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );

      const endOfCurrentMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
      );

      const transactionTime = new Date(transaction.transactionDate).getTime();

      return (
        transactionTime >= beginningOfCurrentMonth.getTime() &&
        transactionTime <= endOfCurrentMonth.getTime()
      );
    });

    if (!allTransactionsWithinPeriod.length) return;

    const currentBudgetPeriod = Number(
      `${new Date().getFullYear()}${new Date().getMonth().toString().padStart(2, "0")}`,
    );

    const budget = await prisma.budgets.findUnique({
      where: {
        userId_period: {
          userId: req.user.id,
          period: currentBudgetPeriod,
        },
      },
      select: {
        currency: true,
      },
    });

    if (!budget) return;

    const budgetCurrency = budget.currency;

    const paymentMethodNames = await prisma.paymentMethods.findMany({
      where: {
        id: {
          in: allValidTransactions.map((c) => c.data.paymentMethodId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const categoryNames = await prisma.categories.findMany({
      where: {
        id: {
          in: allValidTransactions.map((c) => c.data.categoryId),
        },
      },
      select: {
        name: true,
        id: true,
      },
    });

    const paymentMethodMap = new Map(paymentMethodNames.map((pm) => [pm.id, pm.name]));
    const categoryMap = new Map(categoryNames.map((cat) => [cat.id, cat.name]));

    const transactionsToSend = allTransactionsWithinPeriod.map((c) => {
      return {
        budgetCurrency,
        userId: c.userId,
        transactionId: c.id,
        amount: c.amount,
        transactionType: c.transactionType,
        currency: c.currency,
        createdAt: c.createdAt,
        transactionDate: c.transactionDate,
        paymentMethod: paymentMethodMap.get(c.paymentMethodId),
        category: categoryMap.get(c.categoryId),
      };
    });

    const chunks = chunkArray(transactionsToSend, 10);

    const results = await Promise.allSettled(
      chunks.map((chunk) => sendBatchToSQS(chunk, serverEnv.transactionIngestionUrl)),
    );

    let totalSuccessful = 0;
    let totalFailed = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        totalSuccessful += result.value.successful;
        totalFailed += result.value.failed;
      } else {
        logger.error(`Batch ${index} completely failed`, {
          error: result.reason,
        });
        totalFailed += chunks[index].length;
      }
    });

    logger.info("SQS publishing complete", {
      userId: req.user.id,
      totalTransactions: transactionsToSend.length,
      successful: totalSuccessful,
      failed: totalFailed,
      requestId: req.headers["request-id"],
    });

    return;
  } catch (error) {
    logger.error("Failed to publish transactions to SQS", {
      error,
      requestId: req.headers["request-id"],
    });

    return;
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function sendBatchToSQS(transactions: any[], queueUrl: string) {
  try {
    const response = await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: transactions.map((transaction, index) => ({
          Id: `${transaction.id}-${index}`,
          MessageBody: JSON.stringify(transaction),
          MessageAttributes: {
            userId: {
              StringValue: transaction.userId,
              DataType: "String",
            },
            transactionType: {
              StringValue: transaction.transactionType,
              DataType: "String",
            },
          },
        })),
      }),
    );

    if (response.Failed && response.Failed.length > 0) {
      logger.error("Some messages failed to send to transaction ingestion queue", {
        failed: response.Failed,
      });
    }

    return {
      successful: response.Successful?.length || 0,
      failed: response.Failed?.length || 0,
    };
  } catch (error) {
    logger.error("Error sending batch to transaction ingestion queue", { error });
    throw error;
  }
}
