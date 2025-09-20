import z from "zod";
import { FilePart, LanguageModel, TextPart, generateObject } from "ai";

import { Currencies, LogType } from "@prisma/client";

export const parsedReceiptSchema = z
  .array(
    z.object({
      amount: z.string().nonempty(),
      transactionDate: z
        .string()
        .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" })
        .nonoptional()
        .describe("Transaction Date in ISO format"),
      note: z.string().min(10).max(30).optional(),
      logType: z.enum(LogType).nonoptional(),
      currency: z.enum(Currencies).nonoptional(),
      categoryId: z.string().nonempty(),
      paymentMethodId: z.string().nonempty(),
      confidence: z.number(),
    }),
  )
  .meta({
    title: "parsedReceiptSchema",
    description:
      "This is the expected schema that should be returned from the object that was generated",
  });

export const receiptParsingPrompt = `You are a system that parses receipts.
You extract all the expenses and incomes from a receipt or receipt like files and categorize them based on the payment methods and categories provided.
You also provide a confidence rating for each expense and income you have extracted from the file.
If one of the supplied files is not a receipt like file, do not attempt to parse it.
Let the transactionDate be in ISO format.`;
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
      output: "object",
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

    const avgConfidence = this.#checkConfidence(object);
    return { object, finishReason, warnings, usage, avgConfidence, timeTaken };
  }

  #checkConfidence(object: z.infer<typeof parsedReceiptSchema>) {
    const totalConfidence = object.reduce((acc, item) => acc + item.confidence, 0);
    const averageConfidence = totalConfidence / object.length;

    return averageConfidence;
  }
}
