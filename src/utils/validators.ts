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
        operation: z.enum(["insert", "update", "delete"]),
        tableName: z.enum(["budgets", "logs", "categories", "payment_methods"]),
      }),
    )
    .nonempty(),
});

const validateCurrency = z.enum(Currencies, { error: "Invalid Currency" });

export const statementQueryValidator = z.object({
  startDate: z.object({
    year: z.number({ error: "invalid startYear" }),
    month: z.enum(Months, { error: "Invalid startMonth" }),
  }),

  endDate: z.object({
    year: z.number({ error: "Invalid endYear" }),
    month: z.enum(Months, { error: "Invalid endMonth" }),
  }),

  categories: z.array(z.string()),

  paymentMethods: z.array(z.string()),

  currencies: z.array(validateCurrency),
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
