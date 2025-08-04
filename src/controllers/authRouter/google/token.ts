import { Request, Response } from "express";

import * as jose from "jose";

import { v4 as uuid } from "uuid";

import serverEnv from "../../../serverEnv";

import logger from "../../../lib/logger";
import prisma from "../../../lib/prisma";

import {
  GOOGLE_OATH_TOKEN_URL,
  GOOGLE_REDIRECT_URL,
  GOOGLE_TOKEN_ERROR,
  MESSAGES,
  SESSION_EXPIRY,
} from "../../../utils/constants";

export default async function googleToken(req: Request, res: Response) {
  const body = req.body;

  if (!body.code || typeof body.code !== "string") {
    logger.warn(`${GOOGLE_TOKEN_ERROR}: Invalid code`, {
      requestId: req.headers["request-id"],
      ipAddress: req.ip,
      body,
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
    throw new Error(`${GOOGLE_TOKEN_ERROR}: Failed to generate google token`);
  }

  const claims = jose.decodeJwt(data.id_token) as any;

  let user = await prisma.user.findUnique({
    where: {
      email: claims.email!,
    },
  });

  let session;

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
      },
    });

    await prisma.account.create({
      data: {
        id: uuid(),
        accountId: claims.sub,
        providerId: "google",
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    session = await prisma.session.create({
      data: {
        id: uuid(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY),
        token: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        userId: user.id,
      },
    });
  } else {
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    session = await prisma.session.create({
      data: {
        id: uuid(),
        expiresAt: new Date(Date.now() + SESSION_EXPIRY),
        token: uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        userId: user.id,
      },
    });
  }

  //return the user info back to the client
  const userResponse = {
    name: user.name,
    userId: user.id,
    email: user.email,
    sessionId: session.id,
    profileImage: user.image,
    createdAt: user.createdAt,
  };

  return res.status(200).json(userResponse);
}
