describe("serverEnv", () => {
  test("it should contain all the env variables", async () => {
    const serverEnv = await import("../../serverEnv");

    expect(serverEnv.default).toHaveProperty("port");
    expect(serverEnv.default).toHaveProperty("allowedOrigins");
    expect(serverEnv.default).toHaveProperty("redis");
    expect(serverEnv.default).toHaveProperty("googleClientId");
    expect(serverEnv.default).toHaveProperty("googleClientSecret");
    expect(serverEnv.default).toHaveProperty("environment");
    expect(serverEnv.default).toHaveProperty("isProduction");
    expect(serverEnv.default).toHaveProperty("databaseUrl");
    expect(serverEnv.default).toHaveProperty("resend");
    expect(serverEnv.default).toHaveProperty("logLevel");
    expect(serverEnv.default).toHaveProperty("serviceName");
    expect(serverEnv.default).toHaveProperty("otelExporterEndpoint");
    expect(serverEnv.default).toHaveProperty("signozIngestionKey");
    expect(serverEnv.default).toHaveProperty("appScheme");
    expect(serverEnv.default).toHaveProperty("baseUrl");
    expect(serverEnv.default).toHaveProperty("paytrailAWSRegion");
    expect(serverEnv.default).toHaveProperty("paytrailAWSAccessKey");
    expect(serverEnv.default).toHaveProperty("paytrailAWSSecretKey");
    expect(serverEnv.default).toHaveProperty("paytrailStatementSqsQueueUrl");
    expect(serverEnv.default).toHaveProperty("receiptsBucketName");
    expect(serverEnv.default).toHaveProperty("androidPlatformApplicationArn");
    expect(serverEnv.default).toHaveProperty("iosPlatformApplicationArn");
    expect(serverEnv.default).toHaveProperty("broadcastTopicArn");
    expect(serverEnv.default).toHaveProperty("userNotificationsTableARN");
    expect(serverEnv.default).toHaveProperty("broadcastNotificationsTableARN");

    expect(serverEnv.default.port).toBe(process.env.PORT);
    expect(serverEnv.default.allowedOrigins).toBe("*");
    expect(serverEnv.default.redis).toBe(process.env.REDIS_URL);

    expect(serverEnv.default.environment).toBe(process.env.NODE_ENV);

    expect(serverEnv.default.googleClientId).toBe(process.env.GOOGLE_CLIENT_ID);

    expect(serverEnv.default.googleClientSecret).toBe(process.env.GOOGLE_CLIENT_SECRET);

    expect(serverEnv.default.isProduction).toBe(true);

    expect(serverEnv.default.databaseUrl).toBe(process.env.DATABASE_URL);

    expect(serverEnv.default.resend).toBe(process.env.RESEND_KEY);

    expect(serverEnv.default.logLevel).toBe(process.env.LOG_LEVEL);

    expect(serverEnv.default.serviceName).toBe(process.env.SERVICE_NAME);

    expect(serverEnv.default.otelExporterEndpoint).toBe(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
    expect(serverEnv.default.signozIngestionKey).toBe(process.env.SIGNOZ_INGESTION_KEY);

    expect(serverEnv.default.appScheme).toBe(process.env.APP_SCHEME);
    expect(serverEnv.default.baseUrl).toBe(process.env.BASE_URL);
    expect(serverEnv.default.paytrailAWSRegion).toBe(process.env.PAYTRAIL_AWS_REGION);
    expect(serverEnv.default.paytrailAWSAccessKey).toBe(process.env.PAYTRAIL_AWS_ACCESS_KEY);
    expect(serverEnv.default.paytrailAWSSecretKey).toBe(process.env.PAYTRAIL_AWS_SECRET_KEY);
    expect(serverEnv.default.paytrailStatementSqsQueueUrl).toBe(
      process.env.PAYTRAIL_STATEMENT_SQS_QUEUE_URL,
    );
    expect(serverEnv.default.receiptsBucketName).toBe(process.env.RECEIPTS_BUCKET_NAME);
    expect(serverEnv.default.androidPlatformApplicationArn).toBe(
      process.env.ANDROID_SNS_PLATFORM_APPLICATION_ARN,
    );
    expect(serverEnv.default.iosPlatformApplicationArn).toBe(
      process.env.IOS_SNS_PLATFORM_APPLICATION_ARN,
    );
    expect(serverEnv.default.broadcastTopicArn).toBe(process.env.BROADCAST_TOPIC_ARN);
    expect(serverEnv.default.userNotificationsTableARN).toBe(
      process.env.USER_NOTIFICATIONS_TABLE_ARN,
    );
    expect(serverEnv.default.broadcastNotificationsTableARN).toBe(
      process.env.BROADCAST_NOTIFICATIONS_TABLE_ARN,
    );
  });
});
