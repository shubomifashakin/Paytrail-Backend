import { NextFunction } from "express";
import { Server } from "http";
import request from "supertest";

jest.mock("../../../serverEnv", () => ({
  port: "9131",
  allowedOrigins: "*",
  googleClientId: "test-id",
  redis: "redis://localhost:6379",
  googleClientSecret: "test-secret",
  environment: "paytrail-express-backend-test",
  isProduction: true,
  databaseUrl: "postgresql://postgres:postgres_123@localhost:5432/paytrail_postgres",
  baseUrl: "https://test.com",
  appScheme: "paytrail://",
  paytrailStatementSqsQueueUrl: "fake-statement-queue-url",
  broadcastTopicArn: "test-topic-arn",
  androidPlatformApplicationArn: "test-android-arn",
  iosPlatformApplicationArn: "test-ios-arn",
}));

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
  },
});

const upsertDeviceToken = jest.fn().mockResolvedValue({});
jest.mock("../../../lib/prisma", () => {
  return {
    session: {
      findUnique: findUniqueSession,
    },

    deviceToken: {
      upsert: upsertDeviceToken,
    },
  };
});

const subscribe = jest.fn().mockResolvedValue({});
const setEndpointAttributes = jest.fn().mockResolvedValue({});
const createPlatformApplicationEndpoint = jest
  .fn()
  .mockResolvedValue({ EndpointArn: "test-endpoint-arn" });

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command: any) => {
      return command;
    }),
  })),
  SubscribeCommand: subscribe,
  SetEndpointAttributesCommand: setEndpointAttributes,
  CreatePlatformEndpointCommand: createPlatformApplicationEndpoint,
}));

import { API_V1, MESSAGES } from "../../../utils/constants";
import { server as app, startServer } from "../../../server";

describe("registerForPushNotifications", () => {
  let server: Server;

  beforeAll(async () => {
    server = app;

    await startServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test("it should register a push notification", async () => {
    const res = await request(server)
      .post(`${API_V1}/notifications/register`)
      .set("Authorization", "Bearer fake-session-id")
      .set("Content-Type", "application/json")
      .send({
        platform: "android",
        pushToken: "test-token",
      });

    expect(findUniqueSession).toHaveBeenCalledWith({
      where: {
        id: "fake-session-id",
      },
      include: {
        user: true,
      },
    });

    expect(findUniqueSession).toHaveBeenCalledTimes(1);

    expect(createPlatformApplicationEndpoint).toHaveBeenCalledWith({
      Token: "test-token",
      CustomUserData: JSON.stringify({ userId: "new-user-id" }),
      Attributes: { Enabled: "true" },
      PlatformApplicationArn: "test-android-arn",
    });
    expect(upsertDeviceToken).toHaveBeenCalledTimes(1);

    expect(subscribe).toHaveBeenCalledWith({
      TopicArn: "test-topic-arn",
      Endpoint: "test-endpoint-arn",
      Protocol: "application",
    });
    expect(subscribe).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "success" });
  });

  test("it should fail due to invalid post body", async () => {
    const res = await request(server)
      .post(`${API_V1}/notifications/register`)
      .set("Authorization", "Bearer fake-session-id")
      .set("Content-Type", "application/json")
      .send({
        platform: "fake-platform",
        pushToken: "test-token",
      });

    expect(findUniqueSession).toHaveBeenCalledWith({
      where: {
        id: "fake-session-id",
      },
      include: {
        user: true,
      },
    });

    expect(findUniqueSession).toHaveBeenCalledTimes(1);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: MESSAGES.BAD_REQUEST });
  });
});
