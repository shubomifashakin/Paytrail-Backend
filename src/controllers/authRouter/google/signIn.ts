import { Request, Response } from "express";

import serverEnv from "../../../serverEnv";

import { GOOGLE_OAUTH_URL, GOOGLE_REDIRECT_URL, MESSAGES } from "../../../utils/constants";

import { logUnauthenticatedError } from "../../../utils/fns";

export default async function signInWithGoogle(req: Request, res: Response) {
  const redirectUri = req.query.redirect_uri as string;

  if (!redirectUri) {
    logUnauthenticatedError({
      req,
      reason: "Missing redirect_uri",
      message: MESSAGES.GOOGLE_SIGN_IN_ERROR,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  let platform;

  if (redirectUri === serverEnv.appScheme) {
    platform = "mobile";
  } else if (
    redirectUri === serverEnv.baseUrl ||
    redirectUri === `http://localhost:${serverEnv.port}/api-docs/oauth2-redirect.html`
  ) {
    platform = "web";
  } else {
    logUnauthenticatedError({
      req,
      reason: "Invalid redirect_uri",
      message: MESSAGES.GOOGLE_SIGN_IN_ERROR,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
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
