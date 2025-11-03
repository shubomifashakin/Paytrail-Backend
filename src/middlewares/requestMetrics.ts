import { Counter, Histogram, Registry } from "prom-client";
import { NextFunction, Request, Response } from "express";

export default function requestMetrics(register: Registry) {
  const httpRequestCounter = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
  });

  const httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests",
    labelNames: ["method", "route", "status"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  const httpRequestSizeBytes = new Histogram({
    name: "http_request_size_bytes",
    help: "Size of HTTP requests in bytes",
    labelNames: ["method", "route"],
    buckets: [100, 1000, 5000, 15000, 50000],
  });

  const httpResponseSizeBytes = new Histogram({
    name: "http_response_size_bytes",
    help: "Size of HTTP responses in bytes",
    labelNames: ["method", "route", "status"],
    buckets: [100, 1000, 5000, 15000, 50000, 150000, 500000],
  });

  [httpRequestCounter, httpRequestDuration, httpRequestSizeBytes, httpResponseSizeBytes].forEach(
    (metric) => register.registerMetric(metric),
  );

  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpRequestDuration.startTimer();

    if (!req.originalUrl.endsWith("/metrics")) {
      res.on("finish", () => {
        const route = req.route?.path || req.baseUrl;

        httpRequestCounter.inc({
          route,
          method: req.method,
          status: res.statusCode,
        });

        httpRequestSizeBytes.observe(
          { method: req.method, route },
          parseInt(req.headers["content-length"] || "0", 10),
        );

        const responseSize = parseInt((res.getHeader("Content-Length") as string) || "0", 10);
        httpResponseSizeBytes.observe(
          { method: req.method, route, status: res.statusCode },
          responseSize,
        );

        end({
          route,
          method: req.method,
          status: res.statusCode,
        });
      });
    }
    next();
  };
}
