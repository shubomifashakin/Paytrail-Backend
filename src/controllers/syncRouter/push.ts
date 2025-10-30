import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { Request, Response } from "express";

import serverEnv from "../../serverEnv";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import sqsClient from "../../lib/sqsClient";

import { MESSAGES } from "../../utils/constants";
import { pushSchemaValidator } from "../../utils/validators";

import { Logs } from "@prisma/client";

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

      if (c.tableName === "logs" && c.operation === "delete") {
        const exists = await tx.logs.findUnique({ where: { id: c.data.id } });

        if (!exists) continue;

        await tx.logs.delete({
          where: {
            id: c.data.id,
          },
        });
      }

      if (c.tableName === "logs" && (c.operation === "update" || c.operation === "insert")) {
        const latest = await tx.logs.findUnique({
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

        await tx.logs.upsert({
          where: {
            id: c.data.id,
          },
          create: {
            id: c.data.id,
            amount: c.data.amount,
            transactionDate: new Date(c.data.transactionDate),
            note: c.data?.note || "",
            logType: c.data.logType,
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
            logType: c.data.logType,
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
    logger.info("Sending logs to log ingestion queue");

    const allValidLogs = data.data
      .filter((c) => c.tableName === "logs")
      ?.filter((c) => c.operation === "insert" || c.operation === "update");

    if (!allValidLogs.length) return;

    const logsById = allValidLogs.reduce(
      (acc, log) => {
        const logData = log.data as Logs;

        if (!acc.has(logData.id)) {
          acc.set(logData.id, []);
        }
        acc.get(logData.id)?.push(logData);
        return acc;
      },
      new Map() as Map<string, Logs[]>,
    );

    //since a log can be updated multiple times in a batch, we only want the most recent version of each log
    const uniqueLogs = Array.from(logsById.values()).map((logs) => {
      return logs.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
    });

    const allLogsWithinPeriod = uniqueLogs.filter((log) => {
      const beginningOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      return (
        new Date(log.transactionDate).getTime() >= beginningOfCurrentMonth.getTime() &&
        new Date(log.transactionDate).getTime() <= endOfCurrentMonth.getTime()
      );
    });

    if (!allLogsWithinPeriod.length) return;

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
          in: allValidLogs.map((c) => c.data.paymentMethodId),
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
          in: allValidLogs.map((c) => c.data.categoryId),
        },
      },
      select: {
        name: true,
        id: true,
      },
    });

    const paymentMethodMap = new Map(paymentMethodNames.map((pm) => [pm.id, pm.name]));
    const categoryMap = new Map(categoryNames.map((cat) => [cat.id, cat.name]));

    const logsToSend = allLogsWithinPeriod.map((c) => {
      return {
        budgetCurrency,
        userId: c.userId,
        logId: c.id,
        amount: c.amount,
        logType: c.logType,
        currency: c.currency,
        createdAt: c.createdAt,
        transactionDate: c.transactionDate,
        paymentMethod: paymentMethodMap.get(c.paymentMethodId),
        category: categoryMap.get(c.categoryId),
      };
    });

    const chunks = chunkArray(logsToSend, 10);

    const results = await Promise.allSettled(
      chunks.map((chunk) => sendBatchToSQS(chunk, serverEnv.logIngestionQueueUrl)),
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
      totalLogs: logsToSend.length,
      successful: totalSuccessful,
      failed: totalFailed,
      requestId: req.headers["request-id"],
    });

    return;
  } catch (error) {
    logger.error("Failed to publish logs to SQS", { error, requestId: req.headers["request-id"] });

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

async function sendBatchToSQS(logs: any[], queueUrl: string) {
  try {
    const response = await sqsClient.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: logs.map((log, index) => ({
          Id: `${log.id}-${index}`,
          MessageBody: JSON.stringify(log),
          MessageAttributes: {
            userId: {
              StringValue: log.userId,
              DataType: "String",
            },
            logType: {
              StringValue: log.logType,
              DataType: "String",
            },
          },
        })),
      }),
    );

    if (response.Failed && response.Failed.length > 0) {
      logger.error("Some messages failed to send to log ingestion queue", {
        failed: response.Failed,
      });
    }

    return {
      successful: response.Successful?.length || 0,
      failed: response.Failed?.length || 0,
    };
  } catch (error) {
    logger.error("Error sending batch to log ingestion queue", { error });
    throw error;
  }
}
