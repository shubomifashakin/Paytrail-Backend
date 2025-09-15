import { NextFunction } from "express";
import { Server } from "http";
import request from "supertest";

jest.mock("../../../serverEnv", () => ({
  port: "9132",
  allowedOrigins: "*",
  googleClientId: "test-id",
  redis: "redis://localhost:6379",
  googleClientSecret: "test-secret",
  environment: "paytrail-express-backend-test",
  isProduction: true,
  databaseUrl: "postgresql://postgres:postgres_123@localhost:5432/paytrail_postgres",
  baseUrl: "https://test.com",
  appScheme: "paytrail://",
  broadcastTopicArn: "test-topic-arn",
  androidPlatformApplicationArn: "test-android-arn",
  iosPlatformApplicationArn: "test-ios-arn",
  userNotificationsTableARN: "test-user-notifications-table",
}));

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
      console.log("rate limiter");
      next();
    }),
}));

import { API_V1 } from "../../../utils/constants";
import { server as app, startServer } from "../../../server";

describe("getAllUserNotifications", () => {
  let server: Server;

  beforeAll(async () => {
    server = app;
    await startServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("when notifications do not exist", () => {
    test("it should return an empty array", async () => {
      const res = await request(server)
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
      const res = await request(server)
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
            message: "test",
            createdAt: Date.now(),
            notificationType: "test",
            image: "test-image",
          },
        ],
        LastEvaluatedKey: null,
      });
    });

    test("it should return an empty array", async () => {
      const res = await request(server)
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
        TableName: "test-user-notifications-table",
        ExclusiveStartKey: undefined,
        ProjectionExpression: "id, message, createdAt, notificationType, image",
        ExpressionAttributeValues: {
          ":userId": "new-user-id",
        },
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        notifications: [
          {
            id: "1",
            message: "test",
            image: "test-image",
            createdAt: Date.now(),
            notificationType: "test",
          },
        ],
        next: null,
        hasNextPage: false,
      });
    });
  });
});
