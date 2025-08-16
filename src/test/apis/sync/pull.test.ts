import request from "supertest";

import { API_V1 } from "../../../utils/constants";

jest.mock("../../../serverEnv", () => ({
  port: "7000",
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

const findManyLogs = jest.fn().mockResolvedValue([]);

const findManyPaymentMethods = jest.fn().mockResolvedValue([]);

const findManyCategories = jest.fn().mockResolvedValue([]);

const findManyBudgets = jest.fn().mockResolvedValue([]);

const transaction = jest.fn().mockResolvedValue([[], [], [], []]);

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
  },
});

jest.mock("../../../lib/prisma.ts", () => {
  return {
    budgets: {
      findMany: findManyBudgets,
    },

    categories: {
      findMany: findManyCategories,
    },

    paymentMethods: {
      findMany: findManyPaymentMethods,
    },

    logs: {
      findMany: findManyLogs,
    },

    $transaction: transaction,

    session: {
      findUnique: findUniqueSession,
    },
  };
});

import { server as app, startServer } from "../../../server";

import { Server } from "http";

describe("pull test", () => {
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

  test("it should pull from the database", async function () {
    const res = await request(server)
      .get(`${API_V1}/sync/pull`)
      .set("Authorization", "Bearer new-session-id");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(findManyBudgets).toHaveBeenCalled();
    expect(findManyCategories).toHaveBeenCalled();
    expect(findManyPaymentMethods).toHaveBeenCalled();
    expect(findManyLogs).toHaveBeenCalled();

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
