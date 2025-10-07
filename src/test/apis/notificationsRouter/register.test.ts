import { NextFunction } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

import { RedisClientType } from "redis";

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

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

import createApp from "../../../app";
import serverEnv from "../../../serverEnv";
import { API_V1, MESSAGES } from "../../../utils/constants";

import prisma from "../../../lib/prisma";

describe("registerForPushNotifications", () => {
  let sessionId: string;
  let userId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        currency: "USD",
        email: "register@example.com",
        image: "https://example.com/test.jpg",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    const session = await prisma.session.create({
      data: {
        id: uuid(),
        token: "register-token",
        userId: user.id,
        ipAddress: "127.0.0.1",
        createdAt: new Date(),
        updatedAt: new Date(),
        userAgent: "test-agent",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      select: {
        id: true,
      },
    });

    sessionId = session.id;
    userId = user.id;

    createPlatformApplicationEndpoint.mockResolvedValue({ EndpointArn: "test-endpoint-arn" });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        id: sessionId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: userId,
      },
    });
  });

  describe("initial registration", () => {
    beforeAll(async () => {
      jest.clearAllMocks();

      createPlatformApplicationEndpoint.mockResolvedValue({ EndpointArn: "test-endpoint-arn" });
    });

    test("it should register a push notification for android", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/notifications/register`)
        .set("Authorization", `Bearer ${sessionId}`)
        .set("Content-Type", "application/json")
        .send({
          platform: "android",
          pushToken: "test-token",
        });

      expect(createPlatformApplicationEndpoint).toHaveBeenCalledWith({
        Token: "test-token",
        CustomUserData: JSON.stringify({ userId: userId }),
        Attributes: { Enabled: "true" },
        PlatformApplicationArn: serverEnv.androidPlatformApplicationArn,
      });

      expect(subscribe).toHaveBeenCalledWith({
        TopicArn: serverEnv.broadcastTopicArn,
        Endpoint: "test-endpoint-arn",
        Protocol: "application",
      });
      expect(subscribe).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "success" });
    });

    test("it should register a push notification for ios", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/notifications/register`)
        .set("Authorization", `Bearer ${sessionId}`)
        .set("Content-Type", "application/json")
        .send({
          platform: "ios",
          pushToken: "test-token",
        });

      expect(createPlatformApplicationEndpoint).toHaveBeenCalledWith({
        Token: "test-token",
        CustomUserData: JSON.stringify({ userId: userId }),
        Attributes: { Enabled: "true" },
        PlatformApplicationArn: serverEnv.iosPlatformApplicationArn,
      });

      expect(subscribe).toHaveBeenCalledWith({
        TopicArn: serverEnv.broadcastTopicArn,
        Endpoint: "test-endpoint-arn",
        Protocol: "application",
      });
      expect(subscribe).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "success" });
    });

    test("it should fail due to invalid post body", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/notifications/register`)
        .set("Authorization", `Bearer ${sessionId}`)
        .set("Content-Type", "application/json")
        .send({
          platform: "fake-platform",
          pushToken: "test-token",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: MESSAGES.BAD_REQUEST });
    });
  });

  describe("when there is already a device token", () => {
    beforeAll(() => {
      jest.clearAllMocks();

      createPlatformApplicationEndpoint.mockRejectedValue(
        new Error(
          "Endpoint arn:aws:sns:us-east-1:123456789012:endpoint/APNS/my-application/11 already exists",
        ),
      );
    });

    test("it should register a push notification", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/notifications/register`)
        .set("Authorization", `Bearer ${sessionId}`)
        .set("Content-Type", "application/json")
        .send({
          platform: "android",
          pushToken: "test-token",
        });

      expect(createPlatformApplicationEndpoint).toHaveBeenCalledWith({
        Token: "test-token",
        CustomUserData: JSON.stringify({ userId: userId }),
        Attributes: { Enabled: "true" },
        PlatformApplicationArn: serverEnv.androidPlatformApplicationArn,
      });

      expect(setEndpointAttributes).toHaveBeenCalledWith({
        EndpointArn: expect.any(String),
        Attributes: {
          Enabled: "true",
          Token: "test-token",
          CustomUserData: JSON.stringify({ userId: userId }),
        },
      });
      expect(setEndpointAttributes).toHaveBeenCalledTimes(1);

      expect(subscribe).toHaveBeenCalledWith({
        TopicArn: serverEnv.broadcastTopicArn,
        Endpoint: expect.any(String),
        Protocol: "application",
      });
      expect(subscribe).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "success" });
    });
  });
});
