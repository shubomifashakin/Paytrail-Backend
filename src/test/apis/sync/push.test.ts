import request from "supertest";

import { API_V1 } from "../../../utils/constants";

jest.mock("../../../serverEnv", () => ({
  port: "6000",
  allowedOrigins: "*",
  redis: "redis://localhost:6379",
  googleClientId: "test-id",
  googleClientSecret: "test-secret",
  environment: "paytrail-express-backend-test",
  isProduction: true,
  databaseUrl: "postgresql://postgres:postgres_123@localhost:5432/paytrail_postgres",
  baseUrl: "https://test.com",
  appScheme: "paytrail://",
}));

const createBudgets = jest.fn().mockResolvedValue(null);
const updateBudgets = jest.fn().mockResolvedValue(null);
const deleteBudgets = jest.fn().mockResolvedValue(null);

const createCategories = jest.fn().mockResolvedValue(null);
const updateCategories = jest.fn().mockResolvedValue(null);
const deleteCategories = jest.fn().mockResolvedValue(null);

const createPaymentMethods = jest.fn().mockResolvedValue(null);
const updatePaymentMethods = jest.fn().mockResolvedValue(null);
const deletePaymentMethods = jest.fn().mockResolvedValue(null);

const createLogs = jest.fn().mockResolvedValue(null);
const updateLogs = jest.fn().mockResolvedValue(null);
const deleteLogs = jest.fn().mockResolvedValue(null);

const transaction = jest.fn().mockResolvedValue(null);

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
  },
});

jest.mock("../../../lib/prisma.ts", () => {
  return {
    budgets: {
      create: createBudgets,
      update: updateBudgets,
      delete: deleteBudgets,
    },

    categories: {
      create: createCategories,
      update: updateCategories,
      delete: deleteCategories,
    },

    paymentMethods: {
      create: createPaymentMethods,
      update: updatePaymentMethods,
      delete: deletePaymentMethods,
    },

    logs: {
      create: createLogs,
      update: updateLogs,
      delete: deleteLogs,
    },

    $transaction: transaction,

    session: {
      findUnique: findUniqueSession,
    },
  };
});

import { server as app, startServer } from "../../../server";

import { Server } from "http";

describe("push route", () => {
  let server: Server;

  beforeAll(async () => {
    server = app;

    jest.clearAllMocks();
    await startServer();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("it should push the data to the database", async function () {
    const res = await request(server)
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
    expect(createBudgets).toHaveBeenCalled();
    expect(updateBudgets).toHaveBeenCalled();
    expect(deleteBudgets).toHaveBeenCalled();
    expect(createCategories).toHaveBeenCalled();
    expect(updateCategories).toHaveBeenCalled();
    expect(deleteCategories).toHaveBeenCalled();
    expect(createPaymentMethods).toHaveBeenCalled();
    expect(updatePaymentMethods).toHaveBeenCalled();
    expect(deletePaymentMethods).toHaveBeenCalled();
    expect(createLogs).toHaveBeenCalled();
    expect(deleteLogs).toHaveBeenCalled();
    expect(updateLogs).toHaveBeenCalled();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("serverTime");
  });

  test("it should reject requests with invalid operations", async function () {
    const res = await request(server)
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
