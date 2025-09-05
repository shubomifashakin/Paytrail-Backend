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
