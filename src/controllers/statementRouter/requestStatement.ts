import { Currencies, Months } from "@prisma/client";
import { Request, Response } from "express";

import logger from "../../lib/logger";

import { MESSAGES, resendEmailFrom } from "../../utils/constants";

import { statementQueryValidator } from "../../utils/validators";

import prisma from "../../lib/prisma";
import resend from "../../lib/resend";

import {
  generateBudgetStatement,
  generateTransactionsStatement,
  logEmailError,
  makeBudgetPeriod,
  normalizeRequestPath,
} from "../../utils/fns";

export default async function requestStatement(req: Request, res: Response) {
  const { success, error, data } = statementQueryValidator.safeParse(req.body);

  if (!success) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      path: normalizeRequestPath(req),
      userId: req.user.id,
      error: error.issues,
      requestId: req.headers["request-id"],
      userAgent: req.get("user-agent"),
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  if (data.statementType === "budgets") {
    const startDate = data.startDate as { year: number; month: Months } | undefined;
    const endDate = data.endDate as { year: number; month: Months };

    const startPeriod = startDate ? makeBudgetPeriod(startDate.month, startDate.year) : undefined;
    const endPeriod = makeBudgetPeriod(endDate.month, endDate.year);

    const budgets = await prisma.budgets.findMany({
      where: {
        userId: req.user.id,
        period: {
          gte: startPeriod,
          lte: endPeriod,
        },
      },
      select: {
        year: true,
        amount: true,
        budgetMonth: true,
        currency: true,
        id: true,
      },
      orderBy: {
        period: "desc",
      },
    });

    if (!budgets.length) {
      return res.status(404).json({ message: "No budgets found" });
    }

    const budgetIds = budgets.map((budget) => budget.id);

    const transactionsForBudget = await prisma.transactions.findMany({
      relationLoadStrategy: "join",
      where: {
        budgetId: {
          in: budgetIds,
        },
        ...(data.paymentMethods.length
          ? {
              paymentMethodId: {
                in: data.paymentMethods,
              },
            }
          : null),
        ...(data.categories.length
          ? {
              categoryId: {
                in: data.categories,
              },
            }
          : null),
        ...(data.currencies.length
          ? {
              currency: {
                in: data.currencies,
              },
            }
          : null),
      },
      select: {
        note: true,
        amount: true,
        category: {
          select: {
            name: true,
          },
        },
        transactionType: true,
        paymentMethod: {
          select: {
            name: true,
          },
        },
        transactionDate: true,
        currency: true,
        budgetId: true,
      },
    });

    const budgetWithAssociatedTransactions = budgets.map((budget) => {
      const transactionsForBudgetId = transactionsForBudget.filter((c) => c.budgetId === budget.id);

      const transactionsPerCurrency = transactionsForBudgetId.reduce(
        (acc, tx) => {
          const currency = tx.currency;

          if (!acc[currency]) {
            acc[currency] = { transactions: [], totals: { expense: 0, income: 0 } };
          }

          acc[currency].transactions.push(tx);

          if (tx.transactionType === "expense") {
            acc[currency].totals.expense += tx.amount.toNumber();
          } else {
            acc[currency].totals.income += tx.amount.toNumber();
          }

          return acc;
        },
        {} as Record<
          Currencies,
          {
            transactions: typeof transactionsForBudgetId;
            totals: { expense: number; income: number };
          }
        >,
      );

      return {
        budget,
        transactions: transactionsPerCurrency,
      };
    });

    const pt = await generateBudgetStatement({
      userName: req.user.name,
      endDate,
      startDate: startDate || {
        month: budgets[budgets.length - 1].budgetMonth,
        year: budgets[budgets.length - 1].year,
      },
      budgetsAndTransactions: budgetWithAssociatedTransactions,
    });

    const pdf = Buffer.from(pt).toString("base64");

    const { error: mailError } = await resend.emails.send({
      from: resendEmailFrom,
      to: req.user.email,
      subject: "Your PayTrail Statement",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">  
          <p>Hello ${req.user.name || "there"},</p>

          <p>Your PayTrail statement for the period <strong>${
            startDate?.month || budgets[0].budgetMonth
          } ${startDate?.year || budgets[0].year}</strong> to <strong>${endDate.month} ${
            endDate.year
          }</strong> has been generated and is attached to this email.</p>
         
          <p>Thank you for using PayTrail to manage your finances!</p>
          <p>Best regards,<br>The PayTrail Team</p>
        </div>
      `,
      attachments: [
        {
          content: pdf,
          filename: `my-paytrail-report-${Date.now()}.pdf`,
        },
      ],
    });

    if (mailError) {
      logEmailError("statement", req.user, mailError, req);

      return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }

    return res.status(200).json({ message: "success" });
  }

  if (data.statementType === "transactions") {
    const startDate = data.startDate as string | undefined;
    const endDate = data.endDate as string;

    const transactions = await prisma.transactions.findMany({
      relationLoadStrategy: "join",
      where: {
        userId: req.user.id,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(data.paymentMethods.length
          ? {
              paymentMethodId: {
                in: data.paymentMethods,
              },
            }
          : {}),
        ...(data.categories.length
          ? {
              categoryId: {
                in: data.categories,
              },
            }
          : {}),
        ...(data.currencies.length
          ? {
              currency: {
                in: data.currencies,
              },
            }
          : {}),
      },
      select: {
        note: true,
        amount: true,
        category: {
          select: {
            name: true,
          },
        },
        transactionType: true,
        paymentMethod: {
          select: {
            name: true,
          },
        },
        transactionDate: true,
        currency: true,
      },
      orderBy: {
        transactionDate: "desc",
      },
    });

    if (!transactions.length) {
      return res.status(404).json({ message: "No transactions found" });
    }

    const pt = await generateTransactionsStatement({
      userName: req.user.name,
      startDate: startDate || transactions[0].transactionDate.toString(),
      endDate,
      transactions,
    });

    const pdf = Buffer.from(pt).toString("base64");

    const { error: mailError } = await resend.emails.send({
      from: resendEmailFrom,
      to: req.user.email,
      subject: "Your PayTrail Statement",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">  
          <p>Hello ${req.user.name || "there"},</p>

          <p>Your PayTrail statement for the period <strong>${startDate || transactions[0].transactionDate.toDateString()}</strong> to <strong>${new Date(endDate).toDateString()}</strong> has been generated and is attached to this email.</p>
         
          <p>Thank you for using PayTrail to manage your finances!</p>
          <p>Best regards,<br>The PayTrail Team</p>
        </div>
      `,
      attachments: [
        {
          content: pdf,
          filename: `my-paytrail-report-${Date.now()}.pdf`,
        },
      ],
    });

    if (mailError) {
      logEmailError("statement", req.user, mailError, req);

      return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }

    return res.status(200).json({ message: "success" });
  }

  return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
}
