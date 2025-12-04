import * as jose from "jose";
import { createHash } from "crypto";
import { Request, Response } from "express";

import { v4 as uuid } from "uuid";

import prisma from "../../../lib/prisma";
import resend from "../../../lib/resend";
import serverEnv from "../../../serverEnv";

import { signInWithAppleValidator } from "../../../utils/validators";
import { MESSAGES, SESSION_EXPIRY, deleteDaysWindow } from "../../../utils/constants";
import { logUnauthenticatedError, logWarning } from "../../../utils/fns";

export default async function signInWithApple(req: Request, res: Response) {
  const { data, success, error } = signInWithAppleValidator.safeParse(req.body);

  if (!success) {
    logUnauthenticatedError({
      req,
      reason: error.issues,
      message: MESSAGES.BAD_REQUEST,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const JWKS = jose.createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

  const { payload } = await jose.jwtVerify(data.idToken, JWKS, {
    audience: serverEnv.appleBundleId,
    issuer: "https://appleid.apple.com",
  });

  if (!payload?.iss || !payload?.nonce || !payload?.aud || !payload?.sub) {
    logUnauthenticatedError({
      req,
      reason: "Invalid Apple Claims",
      message: MESSAGES.APPLE_SIGN_IN_ERROR,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  if (payload?.nonce_supported && payload.nonce !== data.nonce) {
    logUnauthenticatedError({
      req,
      reason: "Invalid Apple nonce",
      message: MESSAGES.APPLE_SIGN_IN_ERROR,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  if (!payload?.nonce_supported) {
    const computedNonce = createHash("sha256")
      .update(Buffer.from(data.nonce, "utf-8"))
      .digest("base64url");

    if (computedNonce !== payload.nonce) {
      logUnauthenticatedError({
        req,
        reason: "Invalid Apple nonce",
        message: MESSAGES.APPLE_SIGN_IN_ERROR,
      });

      return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
    }
  }

  const claims = payload as jose.JWTPayload & { email: string; email_verified: boolean };

  const accountExists = await prisma.account.findFirst({
    where: {
      accountId: claims.sub!,
    },
    select: {
      user: true,
    },
  });

  let user = accountExists?.user;

  if (user && user.deletedAt) {
    const daysSinceDeletion = Math.floor(
      (Date.now() - user.deletedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceDeletion < deleteDaysWindow) {
      return res.status(423).json({
        email: user.email,
        deletionDate: user.deletedAt,
        message: MESSAGES.ACCOUNT_PENDING_DELETION,
      });
    }

    if (daysSinceDeletion >= deleteDaysWindow) {
      await prisma.user.delete({
        where: { id: user.id },
      });

      user = undefined;
    }
  }

  //user should only have one active session
  if (user) {
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    });
  }

  if (!user) {
    if (!claims.email || !claims.email_verified) {
      logUnauthenticatedError({
        req,
        reason: "Invalid or Empty Apple Email",
        message: MESSAGES.APPLE_SIGN_IN_ERROR,
      });

      return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
    }

    user = await prisma.user.create({
      data: {
        id: uuid(),
        name: data?.firstName ? `${data.firstName} ${data.lastName}` : "",
        email: claims.email!,
        emailVerified: true,
        image: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: "USD",
        PaymentMethods: {
          create: [
            {
              id: uuid(),
              name: "Others",
              color: "#FF0000",
              emoji: "🔄",
              description: "All other payment methods",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
        Categories: {
          create: [
            {
              id: uuid(),
              name: "Others",
              color: "#FF0000",
              emoji: "🔄",
              description: "All other categories",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
        accounts: {
          create: [
            {
              id: uuid(),
              accountId: claims.sub!,
              providerId: "apple",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      },
    });

    const { error } = await resend.contacts.create({
      email: user.email,
      unsubscribed: false,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
    });

    if (error) {
      req.user = user;

      logWarning({
        req,
        message: MESSAGES.RESEND_ERROR,
        reason: `Type:${error.name} Message:${error.message}`,
      });
    }
  }

  const session = await prisma.session.create({
    data: {
      id: uuid(),
      token: uuid(),
      userId: user.id,
      ipAddress: req.ip,
      createdAt: new Date(),
      updatedAt: new Date(),
      userAgent: req.get("user-agent"),
      expiresAt: new Date(Date.now() + SESSION_EXPIRY),
    },
  });

  const userResponse = {
    name: user.name,
    userId: user.id,
    email: user.email,
    sessionId: session.id,
    currency: user.currency,
    profileImage: user.image,
    createdAt: user.createdAt,
  };

  return res.status(200).json(userResponse);
}
