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
  let transactionId: string;

  const oldDate = new Date().toISOString();

  const color = "#FF2000";

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        currency: "USD",
        email: "push@example.com",
        image: "https://example.com/test.jpg",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      select: { id: true, name: true, email: true },
    });

    const session = await prisma.session.create({
      data: {
        id: uuid(),
        token: "push-token",
        userId: user.id,
        ipAddress: "127.0.0.1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        color,
        emoji: "💰",
        description: "Test Payment Method Description",
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      select: {
        id: true,
      },
    });

    const category = await prisma.categories.create({
      data: {
        id: uuid(),
        name: "Test Category",
        color,
        emoji: "💰",
        description: "Test Category Description",
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      select: {
        id: true,
      },
    });

    const transaction = await prisma.transactions.create({
      data: {
        id: uuid(),
        amount: 100,
        transactionDate: new Date().toISOString(),
        note: "Test Note",
        transactionType: "income",
        currency: "NGN",
        categoryId: category.id,
        userId: user.id,
        paymentMethodId: paymentMethod.id,
        budgetId: budget.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    transactionId = transaction.id;
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

    await prisma.transactions.deleteMany({
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
            items: [
              {
                id: uuid(),
                operation: "create",
                tableName: "budgets",
                data: JSON.stringify({
                  id: uuid(),
                  amount: "100",
                  year: 2025,
                  budgetMonth: "February",
                  currency: "NGN",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  period: 202501,
                }),
              },

              {
                id: budgetId,
                operation: "update",
                tableName: "budgets",
                data: JSON.stringify({
                  id: budgetId,
                  amount: "1000", //changed from 100
                  year: 2025,
                  budgetMonth: "January",
                  currency: "NGN",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
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
                operation: "create",
                tableName: "categories",
                data: JSON.stringify({
                  id: uuid(),
                  name: "New Category",
                  color: "#FC3",
                  emoji: "😭",
                  description: "New Category Description",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              },

              {
                id: categoryId,
                operation: "update",
                tableName: "categories",
                data: JSON.stringify({
                  id: categoryId,
                  name: "Updated Category",
                  color,
                  emoji: "💰",
                  description: "Test Category Description",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
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
                operation: "create",
                tableName: "payment_methods",
                data: JSON.stringify({
                  id: uuid(),
                  name: "New Payment Method",
                  color: "#FF1000",
                  emoji: "�",
                  description: "New Payment Method Description",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              },

              {
                id: paymentId,
                operation: "update",
                tableName: "payment_methods",
                data: JSON.stringify({
                  id: paymentId,
                  name: "Updated Payment Method",
                  color,
                  emoji: "💰",
                  description: "Updated Payment Method Description",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
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
                id: transactionId,
                operation: "update",
                tableName: "transactions",
                data: JSON.stringify({
                  id: transactionId,
                  amount: "100",
                  transactionDate: new Date().toISOString(),
                  note: "Test Note",
                  transactionType: "income",
                  currency: "NGN",
                  categoryId: categoryId,
                  userId: userId,
                  paymentMethodId: paymentId,
                  budgetId: budgetId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              },
              {
                id: uuid(),
                operation: "create",
                tableName: "transactions",
                data: JSON.stringify({
                  id: uuid(),
                  amount: "100",
                  transactionDate: new Date().toISOString(),
                  note: "Test Note",
                  transactionType: "income",
                  currency: "NGN",
                  categoryId: categoryId,
                  userId: userId,
                  paymentMethodId: paymentId,
                  budgetId: budgetId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              },

              {
                id: uuid(),
                operation: "delete",
                tableName: "transactions",
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
            items: [
              {
                id: budgetId,
                operation: "update",
                tableName: "budgets",
                data: JSON.stringify({
                  id: budgetId,
                  amount: "5000",
                  userId: userId,
                  currency: "NGN",
                  createdAt: new Date().toISOString(),
                  updatedAt: oldDate,
                  year: 2025,
                  budgetMonth: "January",
                  period: 202500,
                }),
              },
              {
                id: transactionId,
                operation: "update",
                tableName: "transactions",
                data: JSON.stringify({
                  id: transactionId,
                  amount: "2000",
                  transactionDate: new Date().toISOString(),
                  note: "Test Note",
                  transactionType: "income",
                  currency: "NGN",
                  categoryId: categoryId,
                  userId: userId,
                  paymentMethodId: paymentId,
                  budgetId: budgetId,
                  createdAt: new Date().toISOString(),
                  updatedAt: oldDate,
                }),
              },
              {
                id: categoryId,
                operation: "update",
                tableName: "categories",
                data: JSON.stringify({
                  id: categoryId,
                  name: "Updated Category 2",
                  color,
                  emoji: "💰",
                  description: "Updated Category Description",
                  userId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: oldDate,
                }),
              },
              {
                id: paymentId,
                operation: "update",
                tableName: "payment_methods",
                data: JSON.stringify({
                  id: paymentId,
                  name: "Updated Payment Method 2",
                  color,
                  emoji: "💰",
                  description: "Updated Payment Method Description",
                  userId: userId,
                  createdAt: new Date().toISOString(),
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

        const transactionData = await prisma.transactions.findUnique({
          where: {
            id: transactionId,
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

        expect(data?.amount.toString()).toEqual("1000");
        expect(data?.period).toBe(202500);
        expect(transactionData?.amount.toNumber()).toEqual(100);
        expect(categoryData?.name).toEqual("Updated Category");
        expect(paymentData?.name).toEqual("Updated Payment Method");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("serverTime");
      });
    });

    describe("User Pushed Data that clashes with existing data", () => {
      test("it should overwrite the existing data since incoming data is newer", async function () {
        const newDate = new Date().getTime() * 2;
        const newBudgetDate = new Date(newDate);
        const newCategoryDate = newBudgetDate;
        const newPaymentDate = newCategoryDate;

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/sync/push`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send({
            items: [
              {
                id: uuid(),
                operation: "create",
                tableName: "budgets",
                data: JSON.stringify({
                  id: "new-budget-id",
                  userId: userId,
                  amount: "24000",
                  currency: "NGN",
                  createdAt: newBudgetDate,
                  updatedAt: newBudgetDate,
                  year: 2025,
                  budgetMonth: "January",
                  period: 202500,
                }),
              },
              {
                id: uuid(),
                operation: "create",
                tableName: "categories",
                data: JSON.stringify({
                  id: "new-category-id",
                  name: "Newly Created Category",
                  color,
                  emoji: "💰",
                  description: "This is a new category",
                  userId: userId,
                  createdAt: newCategoryDate,
                  updatedAt: newCategoryDate,
                }),
              },
              {
                id: uuid(),
                operation: "create",
                tableName: "payment_methods",
                data: JSON.stringify({
                  id: "new-payment-id",
                  name: "Newly Created Payment Method",
                  color,
                  emoji: "💰",
                  description: "This is a new payment method",
                  userId: userId,
                  createdAt: newPaymentDate,
                  updatedAt: newPaymentDate,
                }),
              },
              {
                id: uuid(),
                operation: "create",
                tableName: "transactions",
                data: JSON.stringify({
                  id: "new-transaction-id",
                  amount: "2000",
                  transactionDate: new Date().toISOString(),
                  note: "Test Note",
                  transactionType: "income",
                  currency: "NGN",
                  categoryId: "new-category-id",
                  userId: userId,
                  paymentMethodId: "new-payment-id",
                  budgetId: "new-budget-id",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              },
            ],
          });

        const budgetData = await prisma.budgets.findUnique({
          where: {
            userId_period: {
              userId: userId,
              period: 202500,
            },
          },
        });

        const transactionData = await prisma.transactions.findUnique({
          where: {
            id: "new-transaction-id",
          },
        });

        const categoryData = await prisma.categories.findUnique({
          where: {
            userId_color: {
              userId: userId,
              color,
            },
          },
        });

        const paymentData = await prisma.paymentMethods.findUnique({
          where: {
            userId_color: {
              userId: userId,
              color,
            },
          },
          select: {
            description: true,
          },
        });

        expect(budgetData?.amount.toString()).toEqual("24000");
        expect(transactionData?.amount.toNumber()).toEqual(2000);
        expect(categoryData?.description).toEqual("This is a new category");
        expect(paymentData?.description).toEqual("This is a new payment method");

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
            items: [
              { id: "1234", operation: "create", tableName: "budgets", data: JSON.stringify({}) },
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
          transactions: expect.any(Array),
          budgets: expect.any(Array),
          categories: expect.any(Array),
          paymentMethods: expect.any(Array),
        },
        serverTime: expect.any(String),
      });
    });
  });
});
