jest.mock("./src/serverEnv", () => {
  return {
    port: "3000",
    redis: "redis://localhost:6379",
    googleClientId: "test-google-client-id",
    googleClientSecret: "test-google-client-secret",
    environment: "production",
    databaseUrl: "postgresql://test:test@localhost:5432/test",
    resend: "test-resend-key",
    logLevel: "info",
    serviceName: "paytrail-test",
    otelExporterEndpoint: "http://localhost:4318",
    signozIngestionKey: "test-signoz-key",
    appScheme: "paytrail://test",
    baseUrl: "http://localhost:3000",
    paytrailAWSRegion: "us-east-1",
    paytrailAWSAccessKey: "test-access-key",
    paytrailAWSSecretKey: "test-secret-key",
    paytrailStatementSqsQueueUrl: "https://sqs.us-east-1.amazonaws.com/test-queue",
    receiptsBucketName: "test-receipts-bucket",
    androidPlatformApplicationArn: "arn:aws:sns:us-east-1:123456789:test-android",
    iosPlatformApplicationArn: "arn:aws:sns:us-east-1:123456789:test-ios",
    broadcastTopicArn: "arn:aws:sns:us-east-1:123456789:test-broadcast",
    userNotificationsTableARN: "arn:aws:dynamodb:us-east-1:123456789:table/test-user-notifications",
    broadcastNotificationsTableARN:
      "arn:aws:dynamodb:us-east-1:123456789:table/test-broadcast-notifications",
  };
});

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));
