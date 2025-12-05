import { Request, Response } from "express";

import serverEnv from "../../../serverEnv";

import { MESSAGES } from "../../../utils/constants";
import { logUnauthenticatedError } from "../../../utils/fns";

export default async function signInWithGoogleCallback(req: Request, res: Response) {
  const code = req.query.code as string | null;

  if (!code) {
    logUnauthenticatedError({
      req,
      reason: "Missing code",
      message: MESSAGES.GOOGLE_SIGN_IN_ERROR,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const receivedState = req.query.state as string | null;

  if (!receivedState) {
    logUnauthenticatedError({
      req,
      reason: "Missing state",
      message: MESSAGES.GOOGLE_SIGN_IN_ERROR,
    });

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  const [platform, state] = receivedState.split("|");

  const redirect = platform === "web" ? serverEnv.baseUrl : `${serverEnv.appScheme}`;

  const params = new URLSearchParams({
    code,
    state,
  });

  return res.redirect(`${redirect}?${params.toString()}`);
}
