import { v4 as uuid } from "uuid";

import { NextFunction, Request, Response } from "express";

//adds a request id to all incoming requests if there wasnt one already
async function tagRequest(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers?.["x-request-id"] as string | undefined;
  const requestId = incomingId || uuid();

  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
}

export default tagRequest;
