import { DeleteEndpointCommand } from "@aws-sdk/client-sns";
import { Request, Response } from "express";

import prisma from "../../lib/prisma";
import resend from "../../lib/resend";
import snsClient from "../../lib/snsClient";

import {
  MESSAGES,
  dateTimeLocale,
  deleteDaysWindow,
  resendEmailFrom,
  supportMail,
} from "../../utils/constants";
import { logAuthenticatedError, logWarning } from "../../utils/fns";

export default async function deleteUserAccount(req: Request, res: Response) {
  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      deletedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      device: true,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: req.user.id,
    },
  });

  const deletionDate = new Date(Date.now() + deleteDaysWindow * 24 * 60 * 60 * 1000);
  const { error: mailError } = await resend.emails.send({
    to: user.email,
    from: resendEmailFrom,
    subject: "We hate to see you go!",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">  
          <p>Hello ${user.name || "there"},</p>

          <p>Your account has been scheduled for deletion and will be permanently deleted on ${deletionDate.toLocaleString(dateTimeLocale, { timeZoneName: "short", hour12: true })}. Until then, you can restore your account by signing back in to Paytrail.</p>
         
          <p>If you did not request this, please contact us at ${supportMail}</p>

          <p>Best regards,<br>The PayTrail Team</p>
        </div>
      `,
  });

  if (mailError) {
    logWarning({
      req,
      message: MESSAGES.RESEND_ERROR,
      reason: `Type:${mailError.name} Message:${mailError.message}`,
    });
  }

  if (user.device.length > 0) {
    await snsClient
      .send(
        new DeleteEndpointCommand({
          EndpointArn: user.device[0].deviceToken,
        }),
      )
      .catch(() => {
        logAuthenticatedError({
          req,
          reason: "Failed to delete endpoint ARN",
          message: MESSAGES.FAILED_TO_DELETE_ENDPOINT_ARN,
        });
      });
  }

  return res.status(200).json({ message: "Success" });
}
