import { NextFunction } from "express";
import { RedisClientType } from "redis";
import request from "supertest";
import { v4 as uuid } from "uuid";

const deleteEndpoint = jest.fn().mockResolvedValue({});
jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command: any) => {
      return command;
    }),
  })),
  DeleteEndpointCommand: deleteEndpoint,
}));

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

import { API_V1 } from "../../../utils/constants";
import createApp from "../../../app";
import prisma from "../../../lib/prisma";

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

describe("Accounts Router", () => {
  let sessionId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        email: "accounts@example.com",
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
        token: "accounts-token",
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
  });

  describe("DELETE /accounts/me", () => {
    test("it should delete the created user", async () => {
      const response = await request(createApp(mockRedis))
        .delete(`${API_V1}/accounts/me`)
        .set("Authorization", `Bearer ${sessionId}`);

      expect(response.statusCode).toBe(200);

      expect(deleteEndpoint).not.toHaveBeenCalled();
    });
  });
});
