import { z } from "zod";

import { Currencies, Months } from "@prisma/client";

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
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
              } catch (error) {
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
  startDate: z
    .object({
      startYear: z.number({ error: "invalid startYear" }),
      startMonth: z.enum(Months, { error: "Invalid startMonth" }),
    })
    .optional(),

  endDate: z.object({
    endYear: z.number({ error: "Invalid endYear" }),
    endMonth: z.enum(Months, { error: "Invalid endMonth" }),
  }),

  categories: z.array(z.string()),

  paymentMethods: z.array(z.string()),

  currencies: z.array(validateCurrency),
});
