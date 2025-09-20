import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

import { FilePart, TextPart } from "ai";
import { Request, Response } from "express";

import { ReceiptParser } from "../../lib/receiptParser";
import logger from "../../lib/logger";
import s3Client from "../../lib/s3Client";

import serverEnv from "../../serverEnv";

import { MESSAGES } from "../../utils/constants";
import { clearBuffer } from "../../utils/fns";
import { receiptParseRequestValidator } from "../../utils/validators";

export async function uploadReceipt(req: Request, res: Response) {
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

  if (data.privacyMode) {
    if (!data.paymentMethods || !data.categories) {
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

    const receiptParser = new ReceiptParser();
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
      privacyMode: data.privacyMode,
      requestId: req.headers["request-id"],
    });

    if (warnings?.length) {
      logger.warn(MESSAGES.AI_GENERATION_WARNINGS, {
        warnings,
        url: req.url,
        userId: req.user.id,
        privacyMode: data.privacyMode,
        requestId: req.headers["request-id"],
      });
    }

    if (finishReason !== "stop") {
      logger.warn(MESSAGES.AI_GENERATION_ENDED, {
        url: req.url,
        userId: req.user.id,
        reason: finishReason,
        privacyMode: data.privacyMode,
        requestId: req.headers["request-id"],
      });

      return res.status(500).json({
        message: MESSAGES.INTERNAL_SERVER_ERROR,
      });
    }

    clearBuffer(req);

    return res.status(200).json({
      logs: object,
      userId: req.user.id,
      privacyMode: data.privacyMode,
    });
  }

  //non-privacy users
  const batchId = uuid();

  const imageKeys: string[] = [];

  const imagesToUpload = files.map((file) => {
    const fileExtension = file.originalname.split(".").pop();

    const uniqueFilename = `receipts/${batchId}/${Date.now()}-${req.user.id}.${fileExtension}`;

    imageKeys.push(uniqueFilename);

    const uploadParams = {
      Body: file.buffer,
      Key: uniqueFilename,
      ContentType: file.mimetype,
      Bucket: serverEnv.receiptsBucketName,
    };

    const command = new PutObjectCommand(uploadParams);

    return s3Client.send(command);
  });

  await Promise.all(imagesToUpload).finally(() => {
    clearBuffer(req);
  });

  const manifestBody = {
    batchId,
    keys: imageKeys,
    uploadedAt: new Date().toISOString(),
    metadata: {
      userId: req.user.id,
    },
  };

  await s3Client.send(
    new PutObjectCommand({
      ContentType: "application/json",
      Body: JSON.stringify(manifestBody),
      Bucket: serverEnv.receiptsBucketName,
      Key: `receipts/${batchId}/manifest.json`,
    }),
  );

  return res.status(200).json({
    logs: [],
    userId: req.user.id,
    privacyMode: data.privacyMode,
  });
}
