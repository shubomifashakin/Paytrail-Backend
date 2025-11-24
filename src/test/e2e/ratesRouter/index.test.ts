import { RedisClientType } from "redis";
import request from "supertest";

import { v4 as uuid } from "uuid";

const mockRedisGet = jest
  .fn()
  .mockResolvedValue(JSON.stringify({ USD: 1, EUR: 0.85 }))
  .mockResolvedValueOnce(undefined)
  .mockResolvedValueOnce(undefined);

const mockRedisSet = jest.fn().mockResolvedValueOnce(true);

const mockRedis = {
  get: mockRedisGet,
  set: mockRedisSet,
  del: jest.fn(),
} as unknown as RedisClientType;

import { API_V1 } from "../../../utils/constants";
import createApp from "../../../app";
import prisma from "../../../lib/prisma";

describe("ratesRouter", () => {
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        currency: "USD",
        email: "rates@example.com",
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
        token: "rates-token",
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
    await prisma.user.deleteMany({
      where: {
        id: userId,
      },
    });

    await prisma.session.deleteMany({
      where: {
        id: sessionId,
      },
    });
  });

  describe("GET /rates", () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: "error",
            error_type: "invalid_currency",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: "success",
            conversion_rates: { USD: 1, EUR: 0.85 },
          }),
      });

    global.fetch = mockFetch;

    describe("should make the call to the api to get the rates", () => {
      test("status code should be 200", async () => {
        const response = await request(createApp(mockRedis))
          .get(`${API_V1}/rates?currency=EUR`)
          .set("Authorization", `Bearer ${sessionId}`);

        expect(mockRedis.get).toHaveBeenCalledWith("rate:EUR");
        expect(mockRedis.set).toHaveBeenCalledWith(
          "rate:EUR",
          JSON.stringify({ USD: 1, EUR: 0.85 }),
          {
            EX: 60 * 60 * 24 * 7,
          },
        );

        expect(response.status).toBe(200);
      });
    });

    describe("should fail to make the call to the api to get the rates", () => {
      test("status code should be 500", async () => {
        const response = await request(createApp(mockRedis))
          .get(`${API_V1}/rates?currency=EUR`)
          .set("Authorization", `Bearer ${sessionId}`);

        expect(mockRedis.get).toHaveBeenCalledWith("rate:EUR");

        expect(response.status).toBe(500);
      });
    });
  });

  describe("GET /rates from cache", () => {
    test("should return the rates from cache", async () => {
      const mockFetch = jest.fn();

      global.fetch = mockFetch;

      const response = await request(createApp(mockRedis))
        .get(`${API_V1}/rates?currency=EUR`)
        .set("Authorization", `Bearer ${sessionId}`);

      expect(mockRedisGet).toHaveBeenCalledWith("rate:EUR");
      expect(mockRedisGet).resolves.toEqual(JSON.stringify({ USD: 1, EUR: 0.85 }));
      expect(mockFetch).not.toHaveBeenCalled();

      expect(response.status).toBe(200);
    });
  });
});
