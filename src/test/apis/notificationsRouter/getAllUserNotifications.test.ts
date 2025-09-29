import { NextFunction } from "express";
import request from "supertest";

import { RedisClientType } from "redis";

const mockSendCommand = jest.fn().mockImplementation((command) => command);
const mockQueryCommand = jest.fn().mockResolvedValue({
  Items: [],
  LastEvaluatedKey: null,
});

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockImplementation(() => ({
      send: mockSendCommand,
    })),
  },
  QueryCommand: mockQueryCommand,
}));

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
  },
});

jest.mock("../../../lib/prisma", () => {
  return {
    session: {
      findUnique: findUniqueSession,
    },
  };
});

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => {
      next();
    }),
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

import createApp from "../../../app";

import { API_V1 } from "../../../utils/constants";
import serverEnv from "../../../serverEnv";

describe("getAllUserNotifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("when notifications do not exist", () => {
    test("it should return an empty array", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/notifications`)
        .set("Authorization", "Bearer fake-session-id");

      expect(findUniqueSession).toHaveBeenCalledWith({
        where: {
          id: "fake-session-id",
        },
        include: {
          user: true,
        },
      });

      expect(findUniqueSession).toHaveBeenCalledTimes(1);

      expect(mockQueryCommand).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        notifications: [],
        next: {},
        hasNextPage: false,
      });
    });

    test("it should return an empty array -- queryparams sent", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/notifications`)
        .set("Authorization", "Bearer fake-session-id")
        .query({
          exclusiveStartKey: JSON.stringify({}),
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

      expect(mockQueryCommand).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        notifications: [],
        next: {},
        hasNextPage: false,
      });
    });
  });

  describe("when notifications exist", () => {
    beforeAll(async () => {
      mockQueryCommand.mockResolvedValue({
        Items: [
          {
            id: "1",
            title: "test",
            subtitle: "test subtitle",
            createdAt: Date.now(),
            notificationType: "test",
            image: "test-image",
          },
        ],
        LastEvaluatedKey: null,
      });
    });

    test("it should return an array with 1 item", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/notifications`)
        .set("Authorization", "Bearer fake-session-id");

      expect(findUniqueSession).toHaveBeenCalledWith({
        where: {
          id: "fake-session-id",
        },
        include: {
          user: true,
        },
      });

      expect(findUniqueSession).toHaveBeenCalledTimes(1);

      expect(mockQueryCommand).toHaveBeenCalledTimes(1);
      expect(mockQueryCommand).toHaveBeenCalledWith({
        Limit: 10,
        ScanIndexForward: false,
        KeyConditionExpression: "userId = :userId",
        TableName: serverEnv.userNotificationsTableARN,
        ExclusiveStartKey: undefined,
        ProjectionExpression: "id, title, subtitle, createdAt, notificationType, image",
        ExpressionAttributeValues: {
          ":userId": "new-user-id",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        notifications: [
          {
            id: "1",
            title: "test",
            subtitle: "test subtitle",
            createdAt: Date.now(),
            notificationType: "test",
            image: "test-image",
          },
        ],
        next: null,
        hasNextPage: false,
      });
    });
  });
});
