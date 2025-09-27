import { NextFunction } from "express";
import request from "supertest";

import { RedisClientType } from "redis";

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

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: jest.fn().mockImplementation((command: any) => {
      return command;
    }),
  })),
  SubscribeCommand: subscribe,
  SetEndpointAttributesCommand: setEndpointAttributes,
  CreatePlatformEndpointCommand: createPlatformApplicationEndpoint,
}));

import createApp from "../../../app";
import { API_V1, MESSAGES } from "../../../utils/constants";

describe("registerForPushNotifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("initial registration", () => {
    beforeAll(() => {
      jest.clearAllMocks();

      createPlatformApplicationEndpoint.mockResolvedValue({ EndpointArn: "test-endpoint-arn" });
    });

    test("it should register a push notification for android", async () => {
      const res = await request(createApp(mockRedis))
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
        PlatformApplicationArn: expect.any(String),
      });
      expect(upsertDeviceToken).toHaveBeenCalledTimes(1);

      expect(subscribe).toHaveBeenCalledWith({
        TopicArn: expect.any(String),
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
        .set("Authorization", "Bearer fake-session-id")
        .set("Content-Type", "application/json")
        .send({
          platform: "ios",
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
        PlatformApplicationArn: expect.any(String),
      });
      expect(upsertDeviceToken).toHaveBeenCalledTimes(1);

      expect(subscribe).toHaveBeenCalledWith({
        TopicArn: expect.any(String),
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
        PlatformApplicationArn: expect.any(String),
      });

      expect(setEndpointAttributes).toHaveBeenCalledWith({
        EndpointArn: expect.any(String),
        Attributes: {
          Enabled: "true",
          Token: "test-token",
          CustomUserData: JSON.stringify({ userId: "new-user-id" }),
        },
      });
      expect(setEndpointAttributes).toHaveBeenCalledTimes(1);
      expect(upsertDeviceToken).toHaveBeenCalledTimes(1);

      expect(subscribe).toHaveBeenCalledWith({
        TopicArn: expect.any(String),
        Endpoint: expect.any(String),
        Protocol: "application",
      });
      expect(subscribe).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "success" });
    });
  });
});
