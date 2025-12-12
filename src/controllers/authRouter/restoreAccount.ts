import { Request, Response } from "express";

import prisma from "../../lib/prisma";
import resend from "../../lib/resend";

import { emailValidator } from "../../utils/validators";
import { MESSAGES, resendEmailFrom, supportMail } from "../../utils/constants";
import { logUnauthenticatedError, logWarning } from "../../utils/fns";

export default async function restoreAccount(req: Request, res: Response) {
  try {
    const { email } = req.body;

    const { success, error } = emailValidator.safeParse(email);

    if (!success) {
      logUnauthenticatedError({
        req,
        reason: error.issues,
        message: MESSAGES.BAD_REQUEST,
      });

      return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
    }

    const user = await prisma.user.update({
      where: {
        email,
      },
      data: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const { error: mailError } = await resend.emails.send({
      to: email,
      from: resendEmailFrom,
      subject: "Your account has been restored",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">  
          <p>Hello ${user.name || "there"},</p>

          <p>Your account has been restored, you can now log in to your account.</p>
         
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

    return res.status(200).json({ message: MESSAGES.SUCCESS });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: MESSAGES.NOT_FOUND });
    }

    throw error;
  }
}
