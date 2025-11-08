import { NextFunction } from "express";
import request from "supertest";
import { v4 as uuid } from "uuid";

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

import prisma from "../../../lib/prisma";

describe("Broadcasts Router", () => {
  let sessionId: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        email: "broadcast@example.com",
        image: "https://example.com/test.jpg",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: "USD",
      },
      select: { id: true },
    });

    const session = await prisma.session.create({
      data: {
        id: uuid(),
        token: "broadcast-token",
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

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("GET /broadcasts (empty notifications)", () => {
    test("it should return an empty array", async () => {
      const res = await request(createApp(mockRedis))
        .get(`${API_V1}/broadcasts`)
        .set("Authorization", `Bearer ${sessionId}`);

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
        .set("Authorization", `Bearer ${sessionId}`)
        .query({
          exclusiveStartKey: JSON.stringify({}),
        });

      expect(mockScanCommand).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        notifications: [],
        next: {},
        hasNextPage: false,
      });
    });
  });

  describe("GET /broadcasts (notifications exist)", () => {
    beforeAll(async () => {
      mockScanCommand.mockResolvedValue({
        Items: [
          {
            id: "1",
            message: "test",
            createdAt: 12345,
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
        .set("Authorization", `Bearer ${sessionId}`);

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
            createdAt: 12345,
            notificationType: "test",
          },
        ],
        next: null,
        hasNextPage: false,
      });
    });
  });
});
