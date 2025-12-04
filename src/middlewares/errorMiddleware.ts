import { NextFunction, Request, Response } from "express";

import { Counter, Registry } from "prom-client";

import logger from "../lib/logger";

import { MESSAGES } from "../utils/constants";
import { normalizeRequestPath } from "../utils/fns";

function errorMiddleware(registry: Registry) {
  const errorCounter = new Counter({
    name: "http_errors_total",
    help: "Total number of HTTP errors",
    labelNames: ["method", "path", "status"],
  });

  registry.registerMetric(errorCounter);

  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = (err as any)?.statusCode || 500;

    errorCounter.inc({
      method: req.method,
      status: statusCode,
      path: normalizeRequestPath(req),
    });

    logger.error("Unhandled error", {
      userId: req.user?.id,
      errorName: err?.name || "Unknown Error",
      stack: err?.stack,
      path: normalizeRequestPath(req),
      requestId: req?.requestId || req.headers?.["x-request-id"],
      userAgent: req.get("user-agent"),

      statusCode,
      method: req?.method,
      ipAddress: req.ip,
    });

    return res.status(statusCode).json({
      message: MESSAGES.INTERNAL_SERVER_ERROR,
    });
  };
}

export default errorMiddleware;
