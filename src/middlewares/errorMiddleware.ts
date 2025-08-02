import { NextFunction, Request, Response } from "express";

import logger from "../lib/logger";

import { MESSAGES } from "../utils/constants";

function errorMiddleware(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode = 500;

  logger.error({
    message: "Unhandled error",
    name: err?.name,
    statusCode,
    path: req?.originalUrl,
    method: req?.method,
    stack: err?.stack,
    requestId: (req as any).requestId || req.headers?.["x-request-id"],
  });

  return res.status(statusCode).json({
    message: MESSAGES.INTERNAL_SERVER_ERROR,
  });
}

export default errorMiddleware;
