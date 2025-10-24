import { NextFunction } from "express";
import request from "supertest";

import { v4 as uuid } from "uuid";

import { RedisClientType } from "redis";

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

describe("Sync Router", () => {
  let sessionId: string;
  let userId: string;
  let budgetId: string;
  let paymentId: string;
  let categoryId: string;
  let logId: string;

  const oldDate = new Date();

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        currency: "USD",
        email: "push@example.com",
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
        token: "push-token",
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

    const budget = await prisma.budgets.create({
      data: {
        id: uuid(),
        userId: user.id,
        amount: 100,
        currency: "NGN",
        createdAt: new Date(),
        updatedAt: new Date(),
        year: 2025,
        budgetMonth: "January",
        period: 202500,
      },
      select: {
        id: true,
      },
    });

    const paymentMethod = await prisma.paymentMethods.create({
      data: {
        id: uuid(),
        name: "Test Payment Method",
        color: "#FF0000",
        emoji: "💰",
        description: "Test Payment Method Description",
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    const category = await prisma.categories.create({
      data: {
        id: uuid(),
        name: "Test Category",
        color: "#FF0000",
        emoji: "💰",
        description: "Test Category Description",
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    const log = await prisma.logs.create({
      data: {
        id: uuid(),
        amount: 100,
        transactionDate: new Date(),
        note: "Test Note",
        logType: "income",
        currency: "NGN",
        categoryId: category.id,
        userId: user.id,
        paymentMethodId: paymentMethod.id,
        budgetId: budget.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    userId = user.id;
    sessionId = session.id;
    budgetId = budget.id;
    paymentId = paymentMethod.id;
    categoryId = category.id;
    logId = log.id;
  });

  afterAll(async () => {
    await prisma.budgets.deleteMany({
      where: {
        userId: userId,
      },
    });

    await prisma.categories.deleteMany({
      where: {
        userId: userId,
      },
    });

    await prisma.paymentMethods.deleteMany({
      where: {
        userId: userId,
      },
    });

    await prisma.logs.deleteMany({
      where: {
        userId: userId,
      },
    });

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

  describe("POST /sync/push", () => {
    describe("first interaction with db", () => {
      test("it should push the data to the database", async function () {
        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/sync/push`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send({
            data: [
              {
                id: uuid(),
                operation: "insert",
                tableName: "budgets",
                data: JSON.stringify({
                  userId: userId,
                  amount: "100",
                  currency: "NGN",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  year: 2025,
                  budgetMonth: "February",
                  period: 202501,
                }),
              },

              {
                id: budgetId,
                operation: "update",
                tableName: "budgets",
                data: JSON.stringify({
                  userId: userId,
                  amount: "1000", //changed from 100
                  currency: "NGN",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  year: 2025,
                  budgetMonth: "January",
                  period: 202500,
                }),
              },

              {
                id: uuid(),
                operation: "delete",
                tableName: "budgets",
                data: JSON.stringify({
                  id: uuid(),
                }),
              },

              {
                id: uuid(),
                operation: "insert",
                tableName: "categories",
                data: JSON.stringify({
                  id: uuid(),
                  name: "New Category",
                  color: "#FC3",
                  emoji: "😭",
                  description: "Test Category Description",
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },

              {
                id: categoryId,
                operation: "update",
                tableName: "categories",
                data: JSON.stringify({
                  name: "Test Category",
                  color: "#FF2000",
                  emoji: "💰",
                  description: "Test Category Description",
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },

              {
                id: uuid(),
                operation: "delete",
                tableName: "categories",
                data: JSON.stringify({
                  id: uuid(),
                }),
              },

              {
                id: uuid(),
                operation: "insert",
                tableName: "payment_methods",
                data: JSON.stringify({
                  name: "New Payment Method",
                  color: "#FF1000",
                  emoji: "�",
                  description: "Test Payment Method Description",
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },

              {
                id: paymentId,
                operation: "update",
                tableName: "payment_methods",
                data: JSON.stringify({
                  name: "Test Payment Method",
                  color: "#FF0000",
                  emoji: "💰",
                  description: "Test Payment Method Description",
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },
              {
                id: uuid(),
                operation: "delete",
                tableName: "payment_methods",
                data: JSON.stringify({
                  id: uuid(),
                }),
              },

              {
                id: logId,
                operation: "update",
                tableName: "logs",
                data: JSON.stringify({
                  amount: "100",
                  transactionDate: new Date(),
                  note: "Test Note",
                  logType: "income",
                  currency: "NGN",
                  categoryId: categoryId,
                  userId: userId,
                  paymentMethodId: paymentId,
                  budgetId: undefined,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },
              {
                id: uuid(),
                operation: "insert",
                tableName: "logs",
                data: JSON.stringify({
                  amount: "100",
                  transactionDate: new Date(),
                  note: "Test Note",
                  logType: "income",
                  currency: "NGN",
                  categoryId: categoryId,
                  userId: userId,
                  paymentMethodId: paymentId,
                  budgetId: budgetId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }),
              },

              {
                id: uuid(),
                operation: "delete",
                tableName: "logs",
                data: JSON.stringify({
                  id: uuid(),
                }),
              },
            ],
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("serverTime");
      });
    });

    describe("second interaction with db", () => {
      test("it should not overwite the existing data since incoming update is older", async function () {
        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/sync/push`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send({
            data: [
              {
                id: budgetId,
                operation: "update",
                tableName: "budgets",
                data: JSON.stringify({
                  userId: userId,
                  amount: 5000,
                  currency: "NGN",
                  createdAt: new Date(),
                  updatedAt: oldDate,
                  year: 2026,
                  budgetMonth: "January",
                  period: 202600,
                }),
              },
              {
                id: logId,
                operation: "update",
                tableName: "logs",
                data: JSON.stringify({
                  amount: "2000",
                  transactionDate: new Date(),
                  note: "Test Note",
                  logType: "income",
                  currency: "NGN",
                  categoryId: categoryId,
                  userId: userId,
                  paymentMethodId: paymentId,
                  budgetId: undefined,
                  createdAt: new Date(),
                  updatedAt: oldDate,
                }),
              },
              {
                id: categoryId,
                operation: "update",
                tableName: "categories",
                data: JSON.stringify({
                  name: "Updated",
                  color: "#000",
                  emoji: "💰",
                  description: "Test Category Description",
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: oldDate,
                }),
              },
              {
                id: paymentId,
                operation: "update",
                tableName: "payment_methods",
                data: JSON.stringify({
                  name: "Updated",
                  color: "#FF2000",
                  emoji: "💰",
                  description: "Test Category Description",
                  userId: userId,
                  createdAt: new Date(),
                  updatedAt: oldDate,
                }),
              },
            ],
          });

        const data = await prisma.budgets.findUnique({
          where: {
            id: budgetId,
          },
        });

        const logData = await prisma.logs.findUnique({
          where: {
            id: logId,
          },
        });

        const categoryData = await prisma.categories.findUnique({
          where: {
            id: categoryId,
          },
        });

        const paymentData = await prisma.paymentMethods.findUnique({
          where: {
            id: paymentId,
          },
        });

        expect(data?.amount.toNumber()).toEqual(1000);
        expect(data?.period).toBe(202500);
        expect(logData?.amount.toNumber()).toEqual(100);
        expect(categoryData?.name).toEqual("Test Category");
        expect(paymentData?.name).toEqual("Test Payment Method");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("serverTime");
      });
    });

    describe("invalid requests", () => {
      test("it should reject requests with invalid operations", async function () {
        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/sync/push`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send({
            data: [
              { id: "1234", operation: "insert", tableName: "budgets", data: JSON.stringify({}) },
              { id: "1234", operation: "update", tableName: "budgets", data: JSON.stringify({}) },
              { id: "1234", operation: "delete", tableName: "budgets", data: JSON.stringify({}) },
              {
                id: "1234",
                operation: "wrongOperation",
                tableName: "categories",
                data: JSON.stringify({}),
              },
            ],
          });

        expect(res.status).toBe(400);
      });
    });
  });

  describe("GET /sync/pull", () => {
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
});
