import { z } from "zod";

import { Currencies, Months, Platforms } from "@prisma/client";

export const pushSchemaValidator = z.object({
  data: z
    .array(
      z.object({
        id: z.string(),
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
});

export const validateCurrency = z.enum(Currencies, { error: "Invalid Currency" });

const periodValidator = z.object(
  {
    year: z.number({ error: "invalid startYear" }),
    month: z.enum(Months, { error: "Invalid startMonth" }),
  },
  { error: "Invalid period" },
);
const dateValidator = z.iso.datetime({ error: "Invalid date" });

export const statementQueryValidator = z
  .object({
    startDate: z.union([periodValidator, dateValidator]).optional(),

    endDate: z.union([periodValidator, dateValidator]),

    categories: z.array(z.string()).optional(),

    paymentMethods: z.array(z.string()).optional(),

    currencies: z.array(validateCurrency).optional(),

    statementType: z.enum(["transactions", "budgets"]),
  })
  .refine((args) => {
    if (args.statementType === "budgets") {
      return (
        periodValidator.optional().safeParse(args.startDate).success &&
        periodValidator.safeParse(args.endDate).success
      );
    }

    return (
      dateValidator.optional().safeParse(args.startDate).success &&
      dateValidator.safeParse(args.endDate).success
    );
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
