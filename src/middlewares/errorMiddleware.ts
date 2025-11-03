import { NextFunction, Request, Response } from "express";

import { Counter, Registry } from "prom-client";

import logger from "../lib/logger";

import { MESSAGES } from "../utils/constants";

function errorMiddleware(registry: Registry) {
  const errorCounter = new Counter({
    name: "http_errors_total",
    help: "Total number of HTTP errors",
    labelNames: ["method", "route", "status"],
  });

  registry.registerMetric(errorCounter);

  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    const statusCode = (err as any)?.statusCode || 500;

    errorCounter.inc({
      method: req.method,
      status: statusCode,
      route: req.route?.path || req.baseUrl,
    });

    logger.error({
      message: "Unhandled error",
      name: err?.name,
      statusCode,
      path: req?.route?.path || req.baseUrl,
      method: req?.method,
      stack: err?.stack,
      requestId: req.requestId || req.headers?.["x-request-id"],
    });

    return res.status(statusCode).json({
      message: MESSAGES.INTERNAL_SERVER_ERROR,
    });
  };
}

export default errorMiddleware;
