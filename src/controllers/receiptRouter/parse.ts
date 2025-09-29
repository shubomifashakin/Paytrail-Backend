import { google } from "@ai-sdk/google";

import { FilePart, NoObjectGeneratedError, TextPart } from "ai";
import { Request, Response } from "express";

import { ReceiptParser } from "../../lib/receiptParser";
import logger from "../../lib/logger";

import { MESSAGES } from "../../utils/constants";
import { receiptParseRequestValidator } from "../../utils/validators";

export default async function parseReceipt(req: Request, res: Response) {
  if (!req.files?.length) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      url: req.url,
      userId: req.user.id,
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
      url: req.url,
      userId: req.user.id,
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
  try {
    const { object, finishReason, warnings, usage, timeTaken } = await receiptParser.parse({
      categories,
      paymentMethods,
      files: fileContents,
    });

    logger.info(MESSAGES.AI_GENERATION_USAGE, {
      usage,
      timeTaken,
      url: req.url,
      userId: req.user.id,
      requestId: req.headers["request-id"],
    });

    if (warnings?.length) {
      logger.warn(MESSAGES.AI_GENERATION_WARNINGS, {
        warnings,
        url: req.url,
        userId: req.user.id,
        requestId: req.headers["request-id"],
      });
    }

    if (finishReason !== "stop") {
      logger.warn(MESSAGES.AI_GENERATION_ENDED, {
        url: req.url,
        userId: req.user.id,
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
    if (NoObjectGeneratedError.isInstance(error)) {
      logger.error(MESSAGES.AI_GENERATION_ERROR, {
        url: req.url,
        userId: req.user.id,
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
}
