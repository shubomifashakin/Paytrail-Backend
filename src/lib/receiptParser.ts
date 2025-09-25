import z from "zod";
import { FilePart, LanguageModel, TextPart, generateObject } from "ai";

import { Currencies, LogType } from "@prisma/client";

const receiptOverview = z.object({
  merchant: z.string().nonoptional(),
  totalItemsPurchased: z.number().nonoptional(),
  totalAmountSpent: z.number().nonoptional(),
  currency: z.enum(Currencies).nonoptional(),
});

const receiptItem = z.object({
  amount: z.string().nonempty(),
  transactionDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" })
    .nonoptional()
    .describe("Transaction Date in ISO format"),
  note: z.string().min(1).max(100).nonoptional(),
  logType: z.enum(LogType).nonoptional(),
  currency: z.enum(Currencies).nonoptional(),
  categoryId: z.string().nonempty(),
  paymentMethodId: z.string().nonempty(),
});

export const parsedReceiptSchema = z
  .object({
    overview: receiptOverview,
    items: z.array(receiptItem),
  })
  .meta({
    title: "parsedReceiptSchema",
    description:
      "This is the expected schema that should be returned from the object that was generated",
  });

export const receiptParsingPrompt = `You are a system that parses receipts.
You extract all the expenses from receipts/receipt-like files and categorize them based on the payment methods and categories provided.
Get the name of the merchant/store from the receipt and use it as the merchant field.
Use the name of each item purchased on the receipt as the respective note of the log.

Overview totalItemsPurchased: Extract the total number of items purchased from the receipt and use it as the totalItemsPurchased field.
Overview totalAmountSpent: Extract the total amount spent from the receipt and use it as the totalAmountSpent field.
Let all dates be in ISO format.

IMPORTANT: Let the result be an array of objects!

IMPORTANT: Ignore any files or images that do not look like a receipt or is not a receipt like file.

IMPORTANT: Exclude all tax related items from the result and the overall total.
`;

//FIXME: ADD CONSTRAINT TO TAG LOGS WHICH DONT HAVE A SUITABLE CATEGORY OR PAYMENT METHOD AS OTHERS

export class ReceiptParser {
  model: LanguageModel;

  constructor(model: LanguageModel) {
    if (!model) {
      throw new Error("Model is required");
    }

    this.model = model;
  }

  async parse({
    files,
    categories,
    paymentMethods,
  }: {
    files: FilePart[];
    categories: TextPart[];
    paymentMethods: TextPart[];
  }) {
    const startTime = Date.now();
    const { object, finishReason, warnings, usage } = await generateObject({
      model: this.model,
      topP: 0.2,
      maxRetries: 1,
      output: "array",
      maxOutputTokens: 2500,
      schema: parsedReceiptSchema,
      system: receiptParsingPrompt,
      abortSignal: AbortSignal.timeout(15000),
      schemaName: parsedReceiptSchema.meta()?.title,
      schemaDescription: parsedReceiptSchema.meta()?.description,
      prompt: [
        { role: "user", content: files },
        { role: "assistant", content: categories },
        { role: "assistant", content: paymentMethods },
      ],
    });

    const timeTaken = Date.now() - startTime;

    return { object, finishReason, warnings, usage, timeTaken };
  }
}
