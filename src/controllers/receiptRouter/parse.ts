import { google } from "@ai-sdk/google";
import { Counter, Histogram, Registry } from "prom-client";

import { FilePart, TextPart } from "ai";
import { Request, Response } from "express";

import { ReceiptParser } from "../../lib/receiptParser";

import { MESSAGES } from "../../utils/constants";
import { receiptParseRequestValidator } from "../../utils/validators";
import { logAuthenticatedError, logWarning } from "../../utils/fns";

export default function parseReceipt(register: Registry) {
  const receiptsProcessedCounter = new Counter({
    name: "receipts_processed_total",
    help: "Total number of receipts processed",
    labelNames: ["filetype", "model"],
  });

  const receiptProcessingTime = new Histogram({
    name: "receipt_processing_seconds",
    help: "Time spent processing receipts",
    labelNames: ["status", "model"],
    buckets: [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5],
  });

  const aiTokenUsage = new Counter({
    name: "ai_token_usage_total",
    help: "Total tokens used by AI model",
    labelNames: ["type", "model"],
  });

  register.registerMetric(receiptsProcessedCounter);
  register.registerMetric(receiptProcessingTime);
  register.registerMetric(aiTokenUsage);

  return async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files.length) {
      logAuthenticatedError({
        req,
        reason: "No files uploaded",
        message: MESSAGES.BAD_REQUEST,
      });

      return res.status(400).json({
        message: MESSAGES.BAD_REQUEST,
      });
    }

    const { success, error, data } = receiptParseRequestValidator.safeParse(req.body);

    if (!success) {
      logAuthenticatedError({
        req,
        reason: error.issues,
        message: MESSAGES.BAD_REQUEST,
      });

      return res.status(400).json({
        message: MESSAGES.BAD_REQUEST,
      });
    }

    const fileContents: FilePart[] = files.map((file) => {
      return { type: "file", filename: file.filename, mediaType: file.mimetype, data: file.buffer };
    });

    const paymentMethods: Array<TextPart> = data.paymentMethods.map((paymentMethod) => {
      return {
        type: "text",
        text: `Payment Method: { description: ${paymentMethod.description}, id: ${paymentMethod.id}}`,
      };
    });

    const categories: Array<TextPart> = data.categories.map((category) => {
      return {
        type: "text",
        text: `Category: {description: ${category.description}, id: ${category.id}}`,
      };
    });

    const model = "gemini-2.5-flash-lite";
    const receiptParser = new ReceiptParser(google(model));

    const endTimer = receiptProcessingTime.startTimer();
    try {
      const { object, finishReason, warnings, usage } = await receiptParser.parse({
        categories,
        paymentMethods,
        files: fileContents,
      });

      endTimer({ status: "success", model: model });
      aiTokenUsage.inc({ type: "prompt", model: model }, usage.inputTokens);
      aiTokenUsage.inc({ type: "completion", model: model }, usage.outputTokens);

      files.forEach((file) => {
        receiptsProcessedCounter.inc({
          model: model,
          filetype: file.mimetype,
        });
      });

      if (warnings?.length) {
        logWarning({
          req,
          reason: warnings,
          message: MESSAGES.AI_GENERATION_WARNINGS,
        });
      }

      if (finishReason !== "stop") {
        logWarning({
          req,
          reason: finishReason,
          message: MESSAGES.AI_GENERATION_ENDED,
        });

        return res.status(500).json({
          message: MESSAGES.INTERNAL_SERVER_ERROR,
        });
      }

      return res.status(200).json({
        data: object,
        userId: req.user.id,
      });
    } catch (error) {
      endTimer({ status: "error", model });

      throw error;
    }
  };
}
