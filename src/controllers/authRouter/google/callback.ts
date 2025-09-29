import { Request, Response } from "express";

import logger from "../../../lib/logger";
import serverEnv from "../../../serverEnv";

import { GOOGLE_SIGN_IN_ERROR, OAUTH_ERRORS } from "../../../utils/constants";

export default async function signInWithGoogleCallback(req: Request, res: Response) {
  const code = req.query.code as string | null;

  if (!code) {
    logger.warn(`${GOOGLE_SIGN_IN_ERROR} Missing code`, {
      requestId: req.headers["request-id"],
      ipAddress: req.ip,
    });
    return res.status(400).json({ message: OAUTH_ERRORS.GOOGLE.INVALID_CODE });
  }

  const receivedState = req.query.state as string | null;

  if (!receivedState) {
    logger.warn(`${GOOGLE_SIGN_IN_ERROR} Missing state`, {
      requestId: req.headers["request-id"],
      ipAddress: req.ip,
    });
    return res.status(400).json({ message: OAUTH_ERRORS.GOOGLE.INVALID_STATE });
  }

  const [platform, state] = receivedState.split("|");

  const redirect =
    platform === "web"
      ? serverEnv.baseUrl
      : serverEnv.environment === "production" //FIXME: REMOVE exp redirect, should only redirect to app scheme
        ? `${serverEnv.appScheme}`
        : `exp://192.168.1.3:8081`;

  const params = new URLSearchParams({
    code,
    state,
  });

  return res.redirect(`${redirect}?${params.toString()}`);
}
