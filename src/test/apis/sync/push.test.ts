import { NextFunction } from "express";
import request from "supertest";

import { API_V1 } from "../../../utils/constants";

const createOrUpdateBudgets = jest.fn().mockResolvedValue(null);
const deleteBudgets = jest.fn().mockResolvedValue(null);

const createOrUpdateCategories = jest.fn().mockResolvedValue(null);
const deleteCategories = jest.fn().mockResolvedValue(null);

const createOrUpdatePaymentMethods = jest.fn().mockResolvedValue(null);
const deletePaymentMethods = jest.fn().mockResolvedValue(null);

const createOrUpdateLogs = jest.fn().mockResolvedValue(null);
const deleteLogs = jest.fn().mockResolvedValue(null);

const transaction = jest.fn().mockResolvedValue(null);

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
  },
});

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as any;

jest.mock("../../../lib/prisma.ts", () => {
  return {
    budgets: {
      upsert: createOrUpdateBudgets,
      deleteMany: deleteBudgets,
    },

    categories: {
      upsert: createOrUpdateCategories,
      deleteMany: deleteCategories,
    },

    paymentMethods: {
      upsert: createOrUpdatePaymentMethods,
      deleteMany: deletePaymentMethods,
    },

    logs: {
      upsert: createOrUpdateLogs,
      deleteMany: deleteLogs,
    },

    $transaction: transaction,

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

import createApp from "../../../app";

describe("push", () => {
  afterAll(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("it should push the data to the database", async function () {
    const res = await request(createApp(mockRedis))
      .post(`${API_V1}/sync/push`)
      .set("Authorization", "Bearer new-session-id")
      .set("Content-Type", "application/json")
      .send({
        data: [
          { id: "1234", operation: "insert", tableName: "budgets", data: JSON.stringify({}) },
          { id: "1234", operation: "update", tableName: "budgets", data: JSON.stringify({}) },
          { id: "1234", operation: "delete", tableName: "budgets", data: JSON.stringify({}) },
          { id: "1234", operation: "insert", tableName: "categories", data: JSON.stringify({}) },
          { id: "1234", operation: "update", tableName: "categories", data: JSON.stringify({}) },
          { id: "1234", operation: "delete", tableName: "categories", data: JSON.stringify({}) },
          {
            id: "1234",
            operation: "insert",
            tableName: "payment_methods",
            data: JSON.stringify({}),
          },
          {
            id: "1234",
            operation: "update",
            tableName: "payment_methods",
            data: JSON.stringify({}),
          },
          {
            id: "1234",
            operation: "delete",
            tableName: "payment_methods",
            data: JSON.stringify({}),
          },
          { id: "1234", operation: "insert", tableName: "logs", data: JSON.stringify({}) },
          { id: "1234", operation: "update", tableName: "logs", data: JSON.stringify({}) },
          { id: "1234", operation: "delete", tableName: "logs", data: JSON.stringify({}) },
        ],
      });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(createOrUpdateBudgets).toHaveBeenCalledTimes(2);
    expect(deleteBudgets).toHaveBeenCalled();
    expect(createOrUpdateCategories).toHaveBeenCalledTimes(2);
    expect(deleteCategories).toHaveBeenCalled();
    expect(createOrUpdatePaymentMethods).toHaveBeenCalledTimes(2);
    expect(deletePaymentMethods).toHaveBeenCalled();
    expect(createOrUpdateLogs).toHaveBeenCalledTimes(2);
    expect(deleteLogs).toHaveBeenCalled();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("serverTime");
  });

  test("it should reject requests with invalid operations", async function () {
    const res = await request(createApp(mockRedis))
      .post(`${API_V1}/sync/push`)
      .set("Authorization", "Bearer new-session-id")
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
