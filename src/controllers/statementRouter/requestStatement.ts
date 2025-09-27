import { Request, Response } from "express";

import logger from "../../lib/logger";

import { MESSAGES } from "../../utils/constants";
import { statementQueryValidator } from "../../utils/validators";

import prisma from "../../lib/prisma";
import resend from "../../lib/resend";

import { generateStatementPdf, logEmailError, makeBudgetPeriod } from "../../utils/fns";

export default async function requestStatement(req: Request, res: Response) {
  const { success, error, data } = statementQueryValidator.safeParse(req.body);

  if (!success) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      url: req.url,
      userId: req.user.id,
      error: error.issues,
      requestId: req.headers["request-id"],
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const startPeriod = makeBudgetPeriod(data.startDate.month, data.startDate.year);
  const endPeriod = makeBudgetPeriod(data.endDate.month, data.endDate.year);

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
  });

  const budgetIds = budgets.map((budget) => budget.id);

  const logsForBudget = await prisma.logs.findMany({
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
      logType: true,
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

  const budgetWithAssociatedLogs = budgets.map((budget) => {
    const logsForBudgetId = logsForBudget.filter((c) => c.budgetId === budget.id);

    const logsPerCurrency = logsForBudgetId.reduce(
      (acc, log) => {
        const currency = log.currency;

        if (!acc[currency]) {
          acc[currency] = { logs: [], totals: { expense: 0, income: 0 } };
        }

        acc[currency].logs.push(log);

        if (log.logType === "expense") {
          acc[currency].totals.expense += log.amount.toNumber();
        } else {
          acc[currency].totals.income += log.amount.toNumber();
        }

        return acc;
      },
      {} as Record<
        string,
        {
          logs: typeof logsForBudgetId;
          totals: { expense: number; income: number };
        }
      >,
    );

    return {
      budget,
      logs: logsPerCurrency,
    };
  });

  const pdf = await generateStatementPdf({
    userName: req.user.name,
    endDate: data.endDate,
    startDate: data.startDate,
    budgetsAndLogs: budgetWithAssociatedLogs,
  });

  const pdfBase64 = Buffer.from(pdf).toString("base64");

  const { error: mailError } = await resend.emails.send({
    from: "Paytrail <onboarding@paytrail.app>", //FIXME: USE CORRECT DOMAIN
    to: req.user.email,
    subject: "Your PayTrail Statement",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">  
          <p>Hello ${req.user.name || "there"},</p>

          <p>Your PayTrail statement for the period <strong>${
            data.startDate.month
          } ${data.startDate.year}</strong> to <strong>${data.endDate.month} ${
            data.endDate.year
          }</strong> has been generated and is attached to this email.</p>
         
          <p>Thank you for using PayTrail to manage your finances!</p>
          <p>Best regards,<br>The PayTrail Team</p>
        </div>
      `,
    attachments: [
      {
        content: pdfBase64,
        filename: `my-paytrail-report-${Date.now()}.pdf`,
      },
    ],
  });

  if (mailError) {
    logEmailError("statement", req.user, mailError, req);
    throw new Error(mailError.name);
  }

  return res.status(200).json({ message: "success" });
}
