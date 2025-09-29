import request from "supertest";
import { v4 as uuid } from "uuid";

import { RedisClientType } from "redis";

import { NextFunction } from "express";

import { API_V1 } from "../../../utils/constants";

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => {
      next();
    }),
}));

import createApp from "../../../app";
import prisma from "../../../lib/prisma";

describe("pull test", () => {
  let sessionId: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        email: "pull@example.com",
        image: "https://example.com/test.jpg",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true, name: true, email: true },
    });

    const session = await prisma.session.create({
      data: {
        id: uuid(),
        token: "pull-token",
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

    userId = user.id;
    sessionId = session.id;
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

    jest.clearAllMocks();
    jest.resetModules();
  });

  test("it should pull from the database", async function () {
    const res = await request(createApp(mockRedis))
      .get(`${API_V1}/sync/pull`)
      .set("Authorization", `Bearer ${sessionId}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        logs: expect.any(Array),
        budgets: expect.any(Array),
        categories: expect.any(Array),
        paymentMethods: expect.any(Array),
      },
      serverTime: expect.any(String),
    });
  });
});
