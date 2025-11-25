import { z } from "zod";
import { Currencies, Months, Platforms, TransactionType } from "@prisma/client";

import logger from "../lib/logger";

import { getMonthIndex } from "./fns";

export const signInWithAppleValidator = z.object({
  nonce: z.string(),
  idToken: z.string(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export const emailValidator = z.email({ error: "Invalid email" });

const dateValidator = z.iso.datetime({ error: "Invalid date" });

export const nameValidator = z
  .string({ error: "Invalid name" })
  .max(50, { error: "Name is too long" });

export const userDetailsValidator = z.object({
  name: nameValidator,
});

const amountValidator = z.string().refine(
  (arg) => {
    if (arg.length > 13) {
      return false;
    }

    const notANumber = isNaN(Number(arg));
    if (notANumber) {
      return false;
    }

    const isNotNegative = Number(arg) >= 0;

    return isNotNegative;
  },
  { error: "Invalid Amount" },
);

const budgetValidator = z
  .object({
    id: z.string(),
    amount: amountValidator,
    year: z.number(),
    budgetMonth: z.enum(Months),
    currency: z.enum(Currencies),
    userId: z.string(),
    createdAt: dateValidator,
    updatedAt: dateValidator,
    period: z.number().refine(
      (arg) => {
        if (String(arg).length !== 6) {
          return false;
        }

        return true;
      },
      { error: "Invalid Period" },
    ),
  })
  .refine(
    (arg) => {
      const year = arg.year;
      const month = arg.budgetMonth;
      const monthIndex = getMonthIndex(month);
      const combined = `${year}${monthIndex}`;

      const period = arg.period;

      return period.toString() === combined;
    },
    { error: "Budget Month & Year dont match period" },
  );

const paymentMethodValidator = z.object({
  id: z.string(),
  name: z.string().max(30),
  color: z.string(),
  emoji: z.string(),
  description: z.string().max(50),
  userId: z.string(),
  createdAt: dateValidator,
  updatedAt: dateValidator,
});

const categoryValidator = paymentMethodValidator;

const transactionValidator = z.object({
  id: z.string(),
  amount: amountValidator,
  transactionDate: dateValidator,
  note: z.string().max(50).optional(),
  transactionType: z.enum(TransactionType),
  currency: z.enum(Currencies),
  categoryId: z.string(),
  userId: z.string(),
  paymentMethodId: z.string(),
  budgetId: z.string(),
  createdAt: dateValidator,
  updatedAt: dateValidator,
});

export const pushSchemaValidator = z
  .object({
    items: z
      .array(
        z.object({
          data: z
            .string()
            .refine(
              (arg) => {
                try {
                  const isParsed = JSON.parse(arg);

                  return isParsed;
                } catch (error) {
                  console.log(error);
                  return false;
                }
              },
              { error: "Data not valid json" },
            )
            .transform((arg) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return JSON.parse(arg) as any;
            }),
          operation: z.enum(["create", "update", "delete"]),
          tableName: z.enum(["budgets", "transactions", "categories", "payment_methods"]),
        }),
      )
      .nonempty(),
  })
  .refine(
    (arg) => {
      const budgets = arg.items.filter(
        (c) => c.tableName === "budgets" && c.operation !== "delete",
      );
      const transactions = arg.items.filter(
        (c) => c.tableName === "transactions" && c.operation !== "delete",
      );

      const categories = arg.items.filter(
        (c) => c.tableName === "categories" && c.operation !== "delete",
      );
      const paymentMethods = arg.items.filter(
        (c) => c.tableName === "payment_methods" && c.operation !== "delete",
      );

      const allValidBudgets = budgets.every((c) => budgetValidator.safeParse(c.data).success);
      const allValidTransactions = transactions.every(
        (c) => transactionValidator.safeParse(c.data).success,
      );
      const allValidCategories = categories.every(
        (c) => categoryValidator.safeParse(c.data).success,
      );
      const allValidPaymentMethods = paymentMethods.every(
        (c) => paymentMethodValidator.safeParse(c.data).success,
      );

      logger.debug("allValidBudgets", { allValidBudgets });
      logger.debug("allValidTransactions", { allValidTransactions });
      logger.debug("allValidCategories", { allValidCategories });
      logger.debug("allValidPaymentMethods", { allValidPaymentMethods });

      return (
        (budgets.length === 0 || allValidBudgets) &&
        (transactions.length === 0 || allValidTransactions) &&
        (categories.length === 0 || allValidCategories) &&
        (paymentMethods.length === 0 || allValidPaymentMethods)
      );
    },
    { error: "Invalid data provided" },
  );

export const validateCurrency = z.enum(Currencies, { error: "Invalid Currency" });

export const statementQueryValidator = z.object({
  startDate: dateValidator.optional(),

  endDate: dateValidator,

  categories: z.array(z.string()).optional(),

  paymentMethods: z.array(z.string()).optional(),

  currencies: z.array(validateCurrency).optional(),

  statementType: z.enum(["transactions", "budgets"]),
});

export const registerForPushNotificationsValidator = z.object({
  pushToken: z.string({ error: "Invalid Push Token" }),
  platform: z.enum(Platforms, { error: "Invalid Platform" }),
});

const expected = z.array(
  z.object({
    id: z.string(),
    description: z.string(),
  }),
);
export const receiptParseRequestValidator = z
  .object({
    categories: z.string(),
    paymentMethods: z.string(),
  })
  .refine(
    (arg) => {
      const paymentMethods = arg.paymentMethods;
      const categories = arg.categories;

      return (
        expected.safeParse(JSON.parse(paymentMethods)).success &&
        expected.safeParse(JSON.parse(categories)).success
      );
    },
    { error: "Invalid paymentMethods or categories" },
  )
  .transform((arg) => {
    return {
      ...arg,
      paymentMethods: expected.parse(JSON.parse(arg.paymentMethods)),
      categories: expected.parse(JSON.parse(arg.categories)),
    };
  });
