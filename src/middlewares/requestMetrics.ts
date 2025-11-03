import client from "prom-client";
import { NextFunction, Request, Response } from "express";

export default function requestMetrics(register: client.Registry) {
  const httpRequestCounter = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
  });
  register.registerMetric(httpRequestCounter);

  const httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests",
    labelNames: ["method", "route", "status"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });
  register.registerMetric(httpRequestDuration);

  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpRequestDuration.startTimer();

    if (!req.originalUrl.endsWith("/metrics")) {
      res.on("finish", () => {
        httpRequestCounter.inc({
          method: req.method,
          route: req.baseUrl,
          status: res.statusCode,
        });

        end({
          method: req.method,
          route: req.baseUrl,
          status: res.statusCode,
        });
      });
    }
    next();
  };
}
