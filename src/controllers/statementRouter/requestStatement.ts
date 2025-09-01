import { Request, Response } from "express";

import { SendMessageCommand } from "@aws-sdk/client-sqs";

import serverEnv from "../../serverEnv";

import sqsClient from "../../lib/sqsClient";

import { MESSAGES } from "../../utils/constants";
import { statementQueryValidator } from "../../utils/validators";

export default async function requestStatement(req: Request, res: Response) {
  const { success, error, data } = statementQueryValidator.safeParse(req.body);

  if (!success) {
    //FIXME: LOG THE ERROR
    console.error(error);

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  await sqsClient.send(
    new SendMessageCommand({
      MessageBody: JSON.stringify({ ...data, userId: req.user.id, requestId: req.requestId }),
      QueueUrl: serverEnv.paytrailStatementSqsQueueUrl,
    }),
  );

  return res.status(200).json({ message: "success" });
}
