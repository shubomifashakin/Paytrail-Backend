import { Request, Response } from "express";

import { Platforms } from "@prisma/client";
import {
  CreatePlatformEndpointCommand,
  SetEndpointAttributesCommand,
  SubscribeCommand,
} from "@aws-sdk/client-sns";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import snsClient from "../../lib/snsClient";

import serverEnv from "../../serverEnv";

import { MESSAGES } from "../../utils/constants";
import { registerForPushNotificationsValidator } from "../../utils/validators";

export default async function registerForPushNotifications(req: Request, res: Response) {
  const userId = req.user.id;

  const body = req.body;

  const { success, error, data } = registerForPushNotificationsValidator.safeParse(body);

  if (!success) {
    logger.error(MESSAGES.BAD_REQUEST, {
      url: req.url,
      userId: req.user.id,
      error: error.issues,
      requestId: req.headers["request-id"],
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const endpointArn = await createPlatformApplicationEndpoint({
    userId: req.user.id,
    platform: data.platform,
    deviceToken: data.pushToken,
    attributes: { Enabled: "true" },
  });

  await prisma.deviceToken.upsert({
    where: {
      userId: userId,
    },
    update: {
      platform: data.platform,
      deviceToken: data.pushToken,
    },
    create: {
      userId,
      enabled: true,
      lastUsedAt: new Date(),
      platform: data.platform,
      deviceToken: data.pushToken,
      snsEndpointArn: endpointArn,
    },
  });

  //subscribe the user to the broadcast topic so we can broadcast notifications to all users
  await subscribeEndpointToTopic(endpointArn, serverEnv.broadcastTopicArn);

  return res.status(200).json({ message: "success" });
}

export async function createPlatformApplicationEndpoint({
  userId,
  platform,
  deviceToken,
  attributes,
  // isSandbox = false,
}: {
  userId: string;
  platform: Platforms;
  deviceToken: string;
  isSandbox?: boolean;
  attributes?: Record<string, string>;
}) {
  const platformApplicationArn =
    platform === "android"
      ? serverEnv.androidPlatformApplicationArn
      : serverEnv.iosPlatformApplicationArn;

  try {
    const res = await snsClient.send(
      new CreatePlatformEndpointCommand({
        Token: deviceToken,
        CustomUserData: JSON.stringify({ userId }),
        Attributes: attributes ?? { Enabled: "true" },
        PlatformApplicationArn: platformApplicationArn,
      }),
    );

    if (!res.EndpointArn) {
      throw new Error("Failed to create platform application endpoint");
    }

    return res.EndpointArn;
  } catch (err: any) {
    const msg: string = err?.message ?? "";
    const match = msg.match(/Endpoint (arn:aws:sns:[^ ]+) already exists/);

    if (match?.[1]) {
      const endpointArn = match[1];

      await snsClient.send(
        new SetEndpointAttributesCommand({
          EndpointArn: endpointArn,
          Attributes: {
            Enabled: "true",
            Token: deviceToken,
            CustomUserData: JSON.stringify({ userId }),
          },
        }),
      );
      return endpointArn;
    }

    throw err;
  }
}

export async function subscribeEndpointToTopic(endpointArn: string, topicArn: string) {
  await snsClient.send(
    new SubscribeCommand({
      TopicArn: topicArn,
      Endpoint: endpointArn,
      Protocol: "application",
    }),
  );
}
