import z from "zod";
import { FilePart, LanguageModel, TextPart, generateObject } from "ai";

import { Currencies, TransactionType } from "@prisma/client";

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
  transactionType: z.enum(TransactionType).nonoptional(),
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
You extract all the expenses or incomes from receipts/receipt-like files and categorize them based on the payment methods and categories provided.
Get the name of the merchant/store from the receipt and use it as the merchant field.
Use the name of each item purchased on the receipt as the respective note of the log.
Think about it before classifying something as an expense or income.

Overview totalItemsPurchased: Extract the total number of items purchased from the receipt and use it as the totalItemsPurchased field.
Overview totalAmountSpent: Extract the total amount spent from the receipt and use it as the totalAmountSpent field. It should match the sum of the amounts of all the items you extracted from the receipt.
Let all dates be in ISO format.

IMPORTANT: Do not try to parse images/files that are not receipts or receipt-like. If an image uploaded is not a receipt throw an error/FAIL.
IMPORTANT: Include the tax amount in the total amount spent. Let the total amount of all the items returned match the total amount spent.

IMPORTANT: For any item you extracted that does not have an appropriate category or paymentMethod description and id supplied, default to the category or paymentMethod with description "All other categories/paymentMethods" for it.
If there is no category for "Tax" use the category with description "All other categories" for it.

IMPORTANT: Let the result be an array of objects!`;

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
        { role: "user", content: categories },
        { role: "user", content: paymentMethods },
      ],
    });

    const timeTaken = Date.now() - startTime;

    return { object, finishReason, warnings, usage, timeTaken };
  }
}
