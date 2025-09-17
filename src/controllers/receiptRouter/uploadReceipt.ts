import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import z from "zod";
import { Request, Response } from "express";

import { MESSAGES } from "../../utils/constants";
import { clearBuffer } from "../../utils/fns";
import s3Client from "../../lib/s3Client";
import serverEnv from "../../serverEnv";

export async function uploadReceipt(req: Request, res: Response) {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    //FIXME: ADD AN ERROR LOGGER
    console.error("no files uploaded");

    return res.status(400).json({
      message: MESSAGES.BAD_REQUEST,
    });
  }

  const { success, error, data } = z
    .object({
      privacyMode: z.enum(["true", "false"], { error: "Invalid privacy mode" }),
    })
    .safeParse(req.body);

  if (!success) {
    //FIXME: LOG THE ERROR
    console.error(error);

    return res.status(400).json({
      message: MESSAGES.BAD_REQUEST,
    });
  }

  if (data.privacyMode === "true") {
    //FIXME: PROCESS ON THE SERVER
    ///RETURN THE RESULTS TO THE USER

    //clear the buffer
    clearBuffer(req);

    return res.status(200).json({});
  }

  const batchId = uuid();

  const imageKeys: string[] = [];

  const imagesToUpload = req.files.map((file) => {
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

  return res.status(200).json({});
}
