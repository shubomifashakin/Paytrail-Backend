import DailyRotateFile from "winston-daily-rotate-file";
import { createLogger, format, transports } from "winston";

import serverEnv from "../serverEnv";

const fileTransport = new DailyRotateFile({
  maxSize: "5m",
  maxFiles: "14d",
  zippedArchive: true,
  datePattern: "YYYY-MM-DD",
  level: serverEnv.logLevel,
  dirname: "/var/log/paytrail",
  filename: "%DATE%.log",
});

const errorTransport = new DailyRotateFile({
  maxSize: "5m",
  maxFiles: "14d",
  zippedArchive: true,
  datePattern: "YYYY-MM-DD",
  level: "error",
  dirname: "/var/log/paytrail",
  filename: "error-%DATE%.log",
});

const logger = createLogger({
  level: serverEnv.logLevel,
  format: format.combine(
    format.timestamp({
      format: () => {
        return new Date().toISOString();
      },
    }),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [fileTransport, errorTransport],
  defaultMeta: { serviceName: serverEnv.serviceName, environment: serverEnv.environment },
});

export default logger;

if (serverEnv.environment !== "production") {
  logger.add(
    new transports.Console({
      format: format.simple(),
    }),
  );
}
