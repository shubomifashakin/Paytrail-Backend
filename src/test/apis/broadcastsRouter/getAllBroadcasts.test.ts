import { NextFunction } from "express";
import request from "supertest";

const mockSendCommand = jest.fn().mockImplementation((command) => command);
const mockScanCommand = jest.fn().mockResolvedValue({
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
  ScanCommand: mockScanCommand,
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

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as any;

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => {
      next();
    }),
}));
import createApp from "../../../app";

import { API_V1 } from "../../../utils/constants";
import serverEnv from "../../../serverEnv";

describe("getAllBroadcasts", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("when notifications do not exist", () => {
    test("it should return an empty array", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/broadcasts`)
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

      expect(mockScanCommand).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        notifications: [],
        next: {},
        hasNextPage: false,
      });
    });

    test("it should return an empty array -- queryparams sent", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/broadcasts`)
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

      expect(mockScanCommand).toHaveBeenCalledTimes(1);

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
      mockScanCommand.mockResolvedValue({
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

    test("it should return an array with 1 item", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/broadcasts`)
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

      expect(mockScanCommand).toHaveBeenCalledTimes(1);
      expect(mockScanCommand).toHaveBeenCalledWith({
        Limit: 10,
        TableName: serverEnv.broadcastNotificationsTableARN,
        ExclusiveStartKey: undefined,
        ProjectionExpression: "id, title, subtitle, createdAt, notificationType, image",
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
