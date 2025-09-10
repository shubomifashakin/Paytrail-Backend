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
      Limit: 1, //FIXME: INCREASE TO A REASONABLE LIMIT
      ScanIndexForward: false,
      ExclusiveStartKey: userKey,
      KeyConditionExpression: "userId = :userId",
      TableName: serverEnv.userNotificationsTableARN,
      ProjectionExpression: "id, message, createdAt, notificationType, image",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }),
  );

  const broadcastNotifications = dynamoClient.send(
    //FIXME: CHANGE TO QUERY COMMAND
    new ScanCommand({
      Limit: 1, //FIXME: INCREASE TO A REASONABLE LIMIT
      ExclusiveStartKey: broadcastKey,
      TableName: serverEnv.broadcastNotificationsTableARN,
      ProjectionExpression: "id, message, createdAt, notificationType, image",
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
    return res.status(200).json({
      notifications: userNotificationsData.Items,
      hasNextPage: userNotificationsData.LastEvaluatedKey,
      next: {
        userKey: userNotificationsData.LastEvaluatedKey,
      },
    });
  }

  if (
    !userNotificationsData.Items &&
    broadcastNotificationsData.Items &&
    broadcastNotificationsData.Items.length
  ) {
    return res.status(200).json({
      notifications: broadcastNotificationsData.Items,
      hasNextPage: broadcastNotificationsData.LastEvaluatedKey,
      next: {
        broadcastKey: broadcastNotificationsData.LastEvaluatedKey,
      },
    });
  }

  if (!userNotificationsData.Items || !broadcastNotificationsData.Items) {
    return res.status(200).json({ notifications: [], hasNextPage: false, next: {} });
  }

  const notifications = [...userNotificationsData.Items, ...broadcastNotificationsData.Items].sort(
    (a, b) => {
      return b.createdAt - a.createdAt;
    },
  );

  return res.status(200).json({
    notifications,
    hasNextPage:
      userNotificationsData.LastEvaluatedKey || broadcastNotificationsData.LastEvaluatedKey,
    next: {
      userKey: userNotificationsData.LastEvaluatedKey,
      broadcastKey: broadcastNotificationsData.LastEvaluatedKey,
    },
  });
}
