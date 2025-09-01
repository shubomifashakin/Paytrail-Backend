import { z } from "zod";

import { Currencies } from "@prisma/client";

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
  startPeriod: z.number(),

  endPeriod: z.number(),

  categories: z.array(z.string()),

  paymentMethods: z.array(z.string()),

  currencies: z.array(validateCurrency),
});
