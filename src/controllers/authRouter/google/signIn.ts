import { Request, Response } from "express";

import serverEnv from "../../../serverEnv";

import logger from "../../../lib/logger";

import {
  GOOGLE_OAUTH_URL,
  GOOGLE_REDIRECT_URL,
  GOOGLE_SIGN_IN_ERROR,
  OAUTH_ERRORS,
} from "../../../utils/constants";

import { normalizeRequestPath } from "../../../utils/fns";

export default async function signInWithGoogle(req: Request, res: Response) {
  const redirectUri = req.query.redirect_uri as string;

  if (!redirectUri) {
    logger.warn(`${GOOGLE_SIGN_IN_ERROR} Missing redirect_uri`, {
      ipAddress: req.ip,
      requestId: req.headers["request-id"],
      path: normalizeRequestPath(req),
    });

    return res.status(400).json({ message: OAUTH_ERRORS.GOOGLE.INVALID_REDIRECT_URI });
  }

  let platform;

  if (redirectUri === serverEnv.appScheme) {
    platform = "mobile";
  } else if (redirectUri === serverEnv.baseUrl) {
    platform = "web";
  } else {
    logger.warn(`${GOOGLE_SIGN_IN_ERROR} Invalid redirect_uri`, {
      ipAddress: req.ip,
      requestId: req.headers["request-id"],
      path: normalizeRequestPath(req),
    });

    return res.status(400).json({ message: OAUTH_ERRORS.GOOGLE.INVALID_REDIRECT_URI });
  }

  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const state = `${platform}|${req.query.state}`;

  const params = new URLSearchParams({
    state,
    response_type: "code",
    scope: scopes.join(" "),
    prompt: "select_account",
    redirect_uri: GOOGLE_REDIRECT_URL,
    client_id: serverEnv.googleClientId!,
  });

  const authUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`;

  return res.redirect(authUrl);
}
