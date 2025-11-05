import { google } from "@ai-sdk/google";
import { Counter, Histogram, Registry } from "prom-client";

import { FilePart, NoObjectGeneratedError, TextPart } from "ai";
import { Request, Response } from "express";

import { ReceiptParser } from "../../lib/receiptParser";
import logger from "../../lib/logger";

import { MESSAGES } from "../../utils/constants";
import { normalizeRequestPath } from "../../utils/fns";
import { receiptParseRequestValidator } from "../../utils/validators";

export default function parseReceipt(register: Registry) {
  const receiptsProcessedCounter = new Counter({
    name: "receipts_processed_total",
    help: "Total number of receipts processed",
    labelNames: ["method", "path", "status"],
  });

  const receiptProcessingTime = new Histogram({
    name: "receipt_processing_seconds",
    help: "Time spent processing receipts",
    labelNames: ["status"],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10],
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
    if (!req.files?.length) {
      logger.warn(MESSAGES.BAD_REQUEST, {
        path: normalizeRequestPath(req),
        error: "No files uploaded",
        requestId: req.headers["request-id"],
      });

      return res.status(400).json({
        message: MESSAGES.BAD_REQUEST,
      });
    }

    const { success, error, data } = receiptParseRequestValidator.safeParse(req.body);

    if (!success) {
      logger.warn(MESSAGES.BAD_REQUEST, {
        path: normalizeRequestPath(req),
        error: error.issues,
        requestId: req.headers["request-id"],
      });

      return res.status(400).json({
        message: MESSAGES.BAD_REQUEST,
      });
    }

    const files = req.files as Express.Multer.File[];

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

    const receiptParser = new ReceiptParser(google("gemini-2.5-flash-lite"));

    const endTimer = receiptProcessingTime.startTimer();
    try {
      const { object, finishReason, warnings, usage, timeTaken } = await receiptParser.parse({
        categories,
        paymentMethods,
        files: fileContents,
      });

      endTimer({ status: "success" });
      aiTokenUsage.inc({ type: "prompt", model: "gemini-2.5-flash-lite" }, usage.inputTokens);
      aiTokenUsage.inc({ type: "completion", model: "gemini-2.5-flash-lite" }, usage.outputTokens);

      receiptsProcessedCounter.inc({
        method: req.method,
        status: res.statusCode,
        path: normalizeRequestPath(req),
      });

      logger.info(MESSAGES.AI_GENERATION_USAGE, {
        usage,
        timeTaken,
        path: normalizeRequestPath(req),
        requestId: req.headers["request-id"],
      });

      if (warnings?.length) {
        logger.warn(MESSAGES.AI_GENERATION_WARNINGS, {
          warnings,
          path: normalizeRequestPath(req),
          requestId: req.headers["request-id"],
        });
      }

      if (finishReason !== "stop") {
        logger.warn(MESSAGES.AI_GENERATION_ENDED, {
          path: normalizeRequestPath(req),
          reason: finishReason,
          requestId: req.headers["request-id"],
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
      endTimer({ status: "error" });

      if (NoObjectGeneratedError.isInstance(error)) {
        logger.error(MESSAGES.AI_GENERATION_ERROR, {
          path: normalizeRequestPath(req),
          error: error.message,
          cause: error.cause,
          variant: "NO_OBJECT_GENERATED",
          text: error.text,
          response: error.response,
          requestId: req.headers["request-id"],
        });
      }

      throw error;
    }
  };
}
