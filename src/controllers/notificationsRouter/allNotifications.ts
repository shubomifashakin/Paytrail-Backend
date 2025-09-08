import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Request, Response } from "express";

import dynamoClient from "../../lib/dynamo";

import serverEnv from "../../serverEnv";

export default async function getAllNotifications(req: Request, res: Response) {
  const userId = req.user.id;

  const exclusiveStartKey = req.query.exclusiveStartKey as string;
  const exclusiveStartKeyObj = JSON.parse(exclusiveStartKey) as {
    userKey?: Record<string, string>;
    broadcastKey?: Record<string, string>;
  };
  const userKey = exclusiveStartKeyObj.userKey;
  const broadcastKey = exclusiveStartKeyObj.broadcastKey;

  const userNotifications = dynamoClient.send(
    new QueryCommand({
      Limit: 10,
      ScanIndexForward: false,
      ExclusiveStartKey: userKey,
      KeyConditionExpression: "userId = :userId",
      TableName: serverEnv.userNotificationsTableARN,
      ProjectionExpression: "id, title, body, createdAt, type",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }),
  );

  const broadcastNotifications = dynamoClient.send(
    new ScanCommand({
      Limit: 10,
      ExclusiveStartKey: broadcastKey,
      TableName: serverEnv.broadcastNotificationsTableARN,
      ProjectionExpression: "id, title, body, createdAt, type",
    }),
  );

  const [userNotificationsData, broadcastNotificationsData] = await Promise.all([
    userNotifications,
    broadcastNotifications,
  ]);

  if (
    userNotificationsData.Items &&
    userNotificationsData.Items.length &&
    !broadcastNotificationsData.Items
  ) {
    return res.status(200).json({ notifications: userNotificationsData.Items });
  }

  if (
    !userNotificationsData.Items &&
    broadcastNotificationsData.Items &&
    broadcastNotificationsData.Items.length
  ) {
    return res.status(200).json({ notifications: broadcastNotificationsData.Items });
  }

  if (!userNotificationsData.Items || !broadcastNotificationsData.Items) {
    return res.status(200).json({ notifications: [] });
  }

  const sortedNotifications = [
    ...userNotificationsData.Items,
    ...broadcastNotificationsData.Items,
  ].sort((a, b) => {
    return b.createdAt - a.createdAt;
  });

  return res.status(200).json({
    notifications: sortedNotifications,
    next: {
      userNotifications: userNotificationsData.LastEvaluatedKey,
      broadcastNotifications: broadcastNotificationsData.LastEvaluatedKey,
    },
  });
}
