import { Request, Response } from "express";

import { DeleteEndpointCommand, NotFoundException, UnsubscribeCommand } from "@aws-sdk/client-sns";

import prisma from "../../lib/prisma";
import snsClient from "../../lib/snsClient";

import { MESSAGES } from "../../utils/constants";
import { normalizeRequestPath } from "../../utils/fns";
import { pushTokenValidator } from "../../utils/validators";

import logger from "../../lib/logger";

export default async function registerForPushNotifications(req: Request, res: Response) {
  const { pushToken } = req.body;

  const { data, success, error } = pushTokenValidator.safeParse(pushToken);

  if (!success) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      path: normalizeRequestPath(req),
      error: error.issues,
      userId: req.user.id,
      requestId: req.headers["request-id"],
      userAgent: req.get("user-agent"),
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const currentEndpointArn = await prisma.deviceToken.findUnique({
    where: {
      deviceToken: data,
    },
    select: {
      snsEndpointArn: true,
      subscriptionArn: true,
    },
  });

  if (!currentEndpointArn) return res.status(200).json({ message: "success" });

  await deleteEndpointArn({
    endpointArn: currentEndpointArn.snsEndpointArn,
  });

  await unsubscriptEndpointFromTopic({
    subscriptionArn: currentEndpointArn.subscriptionArn,
  }).catch((error) => {
    if (!(error instanceof NotFoundException)) {
      throw error;
    }
  });

  await prisma.deviceToken.delete({
    where: {
      deviceToken: data,
    },
  });

  return res.status(200).json({ message: "success" });
}

export async function deleteEndpointArn({ endpointArn }: { endpointArn: string }) {
  await snsClient.send(
    new DeleteEndpointCommand({
      EndpointArn: endpointArn,
    }),
  );
}

export async function unsubscriptEndpointFromTopic({
  subscriptionArn,
}: {
  subscriptionArn: string;
}) {
  await snsClient.send(
    new UnsubscribeCommand({
      SubscriptionArn: subscriptionArn,
    }),
  );
}
