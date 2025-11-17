import { Request, Response } from "express";

import * as jose from "jose";

import { Currencies } from "@prisma/client";
import { v4 as uuid } from "uuid";

import serverEnv from "../../../serverEnv";

import logger from "../../../lib/logger";
import prisma from "../../../lib/prisma";
import resend from "../../../lib/resend";

import {
  GOOGLE_OATH_TOKEN_URL,
  GOOGLE_REDIRECT_URL,
  GOOGLE_TOKEN_ERROR,
  MESSAGES,
  SESSION_EXPIRY,
  deleteDaysWindow,
} from "../../../utils/constants";

import { normalizeRequestPath } from "../../../utils/fns";

export default async function googleToken(req: Request, res: Response) {
  const body = req.body;

  if (!body?.code || typeof body.code !== "string") {
    logger.warn(`${GOOGLE_TOKEN_ERROR}: Invalid code`, {
      ipAddress: req.ip,
      requestId: req.headers["request-id"],
      userAgent: req.get("user-agent"),
      path: normalizeRequestPath(req),
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const code = body.code;

  const googleReq = await fetch(GOOGLE_OATH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URL,
      client_id: serverEnv.googleClientId!,
      client_secret: serverEnv.googleClientSecret!,
    }),
  });

  const data = (await googleReq.json()) as { id_token: string };

  if (!data?.id_token) {
    logger.error(`${GOOGLE_TOKEN_ERROR}: No id token provided`, {
      ipAddress: req.ip,
      requestId: req.headers["request-id"],
      path: normalizeRequestPath(req),
      userAgent: req.get("user-agent"),
    });

    return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  }

  const claims = jose.decodeJwt(data.id_token) as any;

  const currency = Currencies.USD;

  let user = await prisma.user.findUnique({
    where: {
      email: claims.email! as string,
    },
  });

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

    //if for some reason, our cleanup deleted users worker, has not deleted the user, just delete it
    //then treat it as a fresh sign in/sign up
    if (daysSinceDeletion >= deleteDaysWindow) {
      await prisma.user.delete({
        where: { id: user.id },
      });

      user = null;
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
    user = await prisma.user.create({
      data: {
        id: uuid(),
        name: claims.name!,
        email: claims.email!,
        emailVerified: true,
        image: claims.picture!,
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: currency,
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
              accountId: claims.sub,
              providerId: "google",
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
      lastName: claims?.family_name,
      firstName: claims?.given_name || claims.name,
    });

    if (error) {
      logger.warn(MESSAGES.FAILED_TO_CREATE_CONTACT, {
        errorName: error.name,
        errorMessage: error.message,
        ipAddress: req.ip,
        requestId: req.headers["request-id"],
        path: normalizeRequestPath(req),
        userAgent: req.get("user-agent"),
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
