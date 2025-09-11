import { Request, Response } from "express";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

import dynamoClient from "../../lib/dynamo";
import serverEnv from "../../serverEnv";

export default async function getAllnotifications(req: Request, res: Response) {
  const userId = req.user.id;

  const queryParam = req.query.exclusiveStartKey as string;
  const exclusiveStartKey = JSON.parse(queryParam) as Record<string, string>;

  const hasKeys = Object.keys(exclusiveStartKey).length > 0;

  const notifications = await dynamoClient.send(
    new QueryCommand({
      Limit: 10,
      ScanIndexForward: false,
      KeyConditionExpression: "userId = :userId",
      TableName: serverEnv.userNotificationsTableARN,
      ExclusiveStartKey: hasKeys ? exclusiveStartKey : undefined,
      ProjectionExpression: "id, melssage, createdAt, notificationType, image",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }),
  );

  if (!notifications.Items || !notifications.Items.length) {
    return res.status(200).json({
      next: {},
      notifications: [],
      hasNextPage: false,
    });
  }

  return res.status(200).json({
    notifications: notifications.Items,
    next: notifications.LastEvaluatedKey,
    hasNextPage: notifications.LastEvaluatedKey,
  });
}
