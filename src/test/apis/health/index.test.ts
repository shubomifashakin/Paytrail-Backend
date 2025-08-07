import request from "supertest";

jest.mock("../../../serverEnv", () => ({
  port: "5000",
  allowedOrigins: "*",
  redis: "redis://localhost:6379",
  googleClientId: "test-id",
  googleClientSecret: "test-secret",
  environment: "paytrail-express-backend-test",
  isProduction: true,
  databaseUrl: "postgresql://postgres:postgres_123@localhost:5432/paytrail_postgres",
  baseUrl: "https://test.com",
  appScheme: "paytrail://",
}));

import { server, startServer } from "../../../server";

describe("test for the health api", () => {
  beforeAll(async () => {
    await startServer();
  });

  test("it should return a 200 status code", async () => {
    const res = await request(server).get("/health").expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Healthy",
      time: expect.any(String),
    });
  });
});
