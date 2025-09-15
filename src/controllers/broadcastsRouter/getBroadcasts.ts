import { Request, Response } from "express";

import { ScanCommand } from "@aws-sdk/lib-dynamodb";

import dynamoClient from "../../lib/dynamo";
import serverEnv from "../../serverEnv";

export default async function getAllBroadcasts(req: Request, res: Response) {
  const queryParam = (req.query?.exclusiveStartKey as string) || undefined;
  let exclusiveStartKey = {};

  if (queryParam) {
    exclusiveStartKey = JSON.parse(queryParam) as Record<string, string>;
  }

  const hasKeys = Object.keys(exclusiveStartKey).length > 0;

  const broadcasts = await dynamoClient.send(
    new ScanCommand({
      Limit: 10,
      TableName: serverEnv.broadcastNotificationsTableARN,
      ExclusiveStartKey: hasKeys ? exclusiveStartKey : undefined,
      ProjectionExpression: "id, message, createdAt, notificationType, image",
    }),
  );

  if (!broadcasts.Items || !broadcasts.Items.length) {
    return res.status(200).json({
      next: {},
      notifications: [],
      hasNextPage: false,
    });
  }

  return res.status(200).json({
    notifications: broadcasts.Items,
    next: broadcasts.LastEvaluatedKey,
    hasNextPage: broadcasts.LastEvaluatedKey ? true : false,
  });
}
