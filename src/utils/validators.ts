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

const validateCurrency = z.enum(Currencies);

export const validateQueryDate = z.object({
  startDate: z
    .string()
    .optional()
    .refine(
      (arg) => {
        if (!arg) return true;
        return !isNaN(Date.parse(arg));
      },
      {
        error: "startDate must be a valid date string",
      },
    ),

  endDate: z
    .string()
    .optional()
    .refine(
      (arg) => {
        if (!arg) return true;
        return !isNaN(Date.parse(arg));
      },
      {
        error: "endDate must be a valid date string",
      },
    ),

  categories: z.string().refine(
    (arg) => {
      try {
        const parsed = JSON.parse(arg);

        z.array(z.string()).parse(parsed);

        return true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return false;
      }
    },
    { error: "Categories must be a valid string array" },
  ),

  paymentMethods: z.string().refine(
    (arg) => {
      try {
        const parsed = JSON.parse(arg);

        z.array(z.string()).parse(parsed);

        return true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return false;
      }
    },
    { error: "paymentMethods must be a valid string array" },
  ),

  currencies: z.string().refine(
    (arg) => {
      try {
        const parsed = JSON.parse(arg);

        z.array(validateCurrency).parse(parsed);

        return true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return false;
      }
    },
    { error: "Invalid currencies Array" },
  ),
});
