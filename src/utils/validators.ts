import { z } from "zod";

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
