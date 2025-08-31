const serverEnv = {
  port: process.env.PORT,
  allowedOrigins: process.env.ALLOWED_ORIGINS || "*",
  redis: process.env.REDIS_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  environment: process.env.NODE_ENV || "development",
  isProduction:
    process.env.NODE_ENV === "production" || process.env.NODE_ENV?.startsWith("prod") || false,
  databaseUrl: process.env.DATABASE_URL,
  resend: process.env.RESEND_KEY!,
  logLevel: process.env.LOG_LEVEL || "info",
  serviceName: process.env.SERVICE_NAME,
  otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
  signozIngestionKey: process.env.SIGNOZ_INGESTION_KEY!,
  appScheme: process.env.APP_SCHEME!,
  baseUrl: process.env.BASE_URL!,

  paytrailStatementRegion: process.env.PAYTRAIL_STATETMENT_REGION!,
  paytrailStatementSqsAccessKey: process.env.PAYTRAIL_STATEMENT_SQS_ACCESS_KEY!,
  paytrailStatementSqsSecretKey: process.env.PAYTRAIL_STATEMENT_SQS_SECRET_KEY!,
  paytrailStatementSqsQueueUrl: process.env.PAYTRAIL_STATEMENT_SQS_QUEUE_URL!,
};

export default serverEnv;
