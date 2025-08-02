import { createLogger, format, transports } from "winston";

import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import { logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

import serverEnv from "../serverEnv";

//this template uses signoz but you can always configure
const sigNozExporter = new OTLPLogExporter({
  url: serverEnv.otelExporterEndpoint,
  headers: {
    "signoz-access-token": serverEnv.signozIngestionKey,
  },
});

export const loggerProvider = new LoggerProvider({
  processors: [
    new BatchLogRecordProcessor(sigNozExporter, {
      maxExportBatchSize: 600,
      scheduledDelayMillis: 3000,
      exportTimeoutMillis: 15000,
    }),
  ],
  resource: resourceFromAttributes({
    "deployment.environment": serverEnv.environment,
    "service.name": serverEnv.serviceName,
  }),
});

logs.setGlobalLoggerProvider(loggerProvider);

const logger = createLogger({
  level: serverEnv.logLevel,
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [new OpenTelemetryTransportV3()],
});

export default logger;

if (!serverEnv.isProduction) {
  logger.add(
    new transports.Console({
      format: format.simple(),
    }),
  );
}
