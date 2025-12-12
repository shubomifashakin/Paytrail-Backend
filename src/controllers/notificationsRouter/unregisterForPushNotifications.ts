import { Request, Response } from "express";

import { DeleteEndpointCommand, NotFoundException, UnsubscribeCommand } from "@aws-sdk/client-sns";

import prisma from "../../lib/prisma";
import snsClient from "../../lib/snsClient";

import { MESSAGES } from "../../utils/constants";
import { logAuthenticatedError } from "../../utils/fns";
import { pushTokenValidator } from "../../utils/validators";

export default async function registerForPushNotifications(req: Request, res: Response) {
  const { pushToken } = req.body;

  const { data, success, error } = pushTokenValidator.safeParse(pushToken);

  if (!success) {
    logAuthenticatedError({
      req,
      reason: error.issues,
      message: MESSAGES.BAD_REQUEST,
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
