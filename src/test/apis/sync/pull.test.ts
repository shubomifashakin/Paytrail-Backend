import request from "supertest";

import { NextFunction } from "express";

import { API_V1 } from "../../../utils/constants";

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

describe("pull test", () => {
  afterAll(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("it should pull from the database", async function () {
    const res = await request(createApp(mockRedis))
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
