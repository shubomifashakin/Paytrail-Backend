import { NextFunction, Request, Response } from "express";

import * as jose from "jose";

import serverEnv from "../serverEnv";

export default async function validateRequestDeleteJwt(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const secret = new TextEncoder().encode(serverEnv.googleFormsJwtSecret);

  try {
    const claims = (await jose.jwtVerify(token, secret)) as unknown;

    if (!claims) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return next();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err: unknown) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
