import { RedisClientType } from "redis";
import request from "supertest";
import { v4 as uuid } from "uuid";

const sendMail = jest.fn().mockResolvedValue({
  error: null,
});
const resend = jest.fn().mockImplementation(() => ({
  emails: {
    send: sendMail,
  },
}));
jest.mock("resend", () => ({
  Resend: resend,
}));

const deleteEndpoint = jest.fn().mockResolvedValue({});
jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockImplementation((command: any) => {
      return command;
    }),
  })),
  DeleteEndpointCommand: deleteEndpoint,
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
  let userId: string;
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

    userId = user.id;
    sessionId = session.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: userId,
      },
    });
  });

  describe("PATCH /accounts/me", () => {
    test("it should update the information of the created user", async () => {
      const response = await request(createApp(mockRedis))
        .patch(`${API_V1}/accounts/me`)
        .send({ name: "New Name" })
        .set("Authorization", `Bearer ${sessionId}`);

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(user?.name).toBeDefined();
      expect(user?.name).toBe("New Name");

      expect(deleteEndpoint).not.toHaveBeenCalled();
    });

    test("it should fail to update the information of the created user due to invalid body", async () => {
      const response = await request(createApp(mockRedis))
        .patch(`${API_V1}/accounts/me`)
        .set("Authorization", `Bearer ${sessionId}`);

      expect(response.statusCode).toBe(400);
    });
  });

  describe("DELETE /accounts/me", () => {
    test("it should delete the created user", async () => {
      const response = await request(createApp(mockRedis))
        .delete(`${API_V1}/accounts/me`)
        .set("Authorization", `Bearer ${sessionId}`);

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          sessions: true,
          deletedAt: true,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(user?.deletedAt).toBeDefined();
      expect(user?.sessions).toHaveLength(0);

      expect(deleteEndpoint).not.toHaveBeenCalled();
    });
  });
});
