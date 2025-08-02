describe("serverEnv", () => {
  beforeAll(() => {
    process.env.PORT = "0";
    process.env.NODE_ENV = "test";
    process.env.REDIS_URL = "redis://localhost:6379/1";
    process.env.GOOGLE_CLIENT_ID = "fake-google-id";
    process.env.GOOGLE_CLIENT_SECRET = "fake-google-secret";
    process.env.DATABASE_URL = "postgres://user:password@localhost:5432/db";
    process.env.RESEND_KEY = "fake-rend-key";
    process.env.LOG_LEVEL = "info";
    process.env.SERVICE_NAME = "test";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
    process.env.SIGNOZ_INGESTION_KEY = "fake-signoz-key";
  });

  afterAll(() => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.REDIS_URL;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.RESEND_KEY;
    delete process.env.LOG_LEVEL;
    delete process.env.SERVICE_NAME;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.SIGNOZ_INGESTION_KEY;
  });

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

    expect(serverEnv.default.port).toBe("0");
    expect(serverEnv.default.allowedOrigins).toBe("*");
    expect(serverEnv.default.redis).toBe("redis://localhost:6379/1");

    expect(serverEnv.default.environment).toBe("test");

    expect(serverEnv.default.googleClientId).toBe("fake-google-id");

    expect(serverEnv.default.googleClientSecret).toBe("fake-google-secret");

    expect(serverEnv.default.isProduction).toBe(false);

    expect(serverEnv.default.databaseUrl).toBe("postgres://user:password@localhost:5432/db");

    expect(serverEnv.default.resend).toBe("fake-rend-key");

    expect(serverEnv.default.logLevel).toBe("info");

    expect(serverEnv.default.serviceName).toBe("test");

    expect(serverEnv.default.otelExporterEndpoint).toBe("http://localhost:4318");
    expect(serverEnv.default.signozIngestionKey).toBe("fake-signoz-key");
  });
});
