import { Request, Response } from "express";

import logger from "../../lib/logger";
import prisma from "../../lib/prisma";
import resend from "../../lib/resend";

import { emailValidator } from "../../utils/validators";
import { logEmailError } from "../../utils/fns";
import { normalizeRequestPath } from "../../utils/fns";
import { MESSAGES, resendEmailFrom } from "../../utils/constants";

export default async function restoreAccount(req: Request, res: Response) {
  const { email } = req.body;

  const emailValidation = emailValidator.safeParse(email);

  if (!emailValidation.success) {
    logger.warn(MESSAGES.BAD_REQUEST, {
      path: normalizeRequestPath(req),
      userId: req.user.id,
      error: emailValidation.error.issues,
      requestId: req.headers["request-id"],
      userAgent: req.get("user-agent"),
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const user = await prisma.user.findUnique({
    where: {
      email: emailValidation.data,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: MESSAGES.NOT_FOUND });
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      deletedAt: null,
    },
  });

  const { error: mailError } = await resend.emails.send({
    to: user.email,
    from: resendEmailFrom,
    subject: "Your account has been restored",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">  
          <p>Hello ${user.name || "there"},</p>

          <p>Your account has been restored, you can now log in to your account.</p>
         
          <p>If you did not request this, please contact us at support@paytrail.app</p>

          <p>Best regards,<br>The PayTrail Team</p>
        </div>
      `,
  });

  if (mailError) {
    logEmailError("restoreAccount", user, mailError, req);
  }

  return res.status(200).json({ message: MESSAGES.SUCCESS });
}
