import { DeleteEndpointCommand } from "@aws-sdk/client-sns";
import { Request, Response } from "express";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import snsClient from "../../lib/snsClient";

import { MESSAGES } from "../../utils/constants";
import { normalizeRequestPath } from "../../utils/fns";

export default async function deleteUserAccount(req: Request, res: Response) {
  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      deletedAt: new Date(),
    },
    select: {
      device: true,
    },
  });

  //revoke sessions
  await prisma.session.deleteMany({
    where: {
      userId: req.user.id,
    },
  });

  if (user.device.length > 0) {
    await snsClient
      .send(
        new DeleteEndpointCommand({
          EndpointArn: user.device[0].deviceToken,
        }),
      )
      .catch(() => {
        logger.error(MESSAGES.FAILED_TO_DELETE_ENDPOINT_ARN, {
          userId: req.user.id,
          requestId: req.headers["request-id"],
          route: normalizeRequestPath(req),
          userAgent: req.get("user-agent"),
        });
      });
  }

  return res.status(200).json({ message: "Success" });
}
