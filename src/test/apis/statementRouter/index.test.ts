import request from "supertest";

import { RedisClientType } from "redis";

import { API_V1, MESSAGES } from "../../../utils/constants";

import { Decimal } from "@prisma/client/runtime/library";
import { NextFunction } from "express";

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

const userEmail = "test@example.com";
const userName = "Test User";

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
    email: userEmail,
    name: userName,
  },
});

jest.mock("../../../lib/prisma.ts", () => {
  return {
    session: {
      findUnique: findUniqueSession,
    },
    budgets: {
      findMany: jest.fn().mockResolvedValue([
        {
          year: 2025,
          amount: new Decimal(100),
          budgetMonth: "January",
          currency: "USD",
          id: "budget-id",
        },
      ]),
    },
    logs: {
      findMany: jest.fn().mockResolvedValue([
        {
          note: "Test log",
          amount: new Decimal(100),
          category: {
            name: "Test category",
          },
          logType: "expense",
          paymentMethod: {
            name: "Test payment method",
          },
          transactionDate: new Date(),
          currency: "USD",
          budgetId: "budget-id",
        },
        {
          note: "Test log",
          amount: new Decimal(100),
          category: {
            name: "Test category",
          },
          logType: "income",
          paymentMethod: {
            name: "Test payment method",
          },
          transactionDate: new Date(),
          currency: "USD",
          budgetId: "budget-id",
        },
      ]),
    },
  };
});

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

const setContent = jest.fn().mockResolvedValue(undefined);
const pdf = jest.fn().mockResolvedValue(Buffer.from("PDF_CONTENT"));
const newPage = jest.fn().mockResolvedValue({
  pdf,
  setContent,
});
const close = jest.fn().mockResolvedValue(undefined);
const launch = jest.fn().mockResolvedValue({
  close,
  newPage,
});

jest.mock("puppeteer", () => ({
  __esModule: true,
  default: {
    launch,
  },
}));

import createApp from "../../../app";

describe("requestStatement", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("when emails are sent successfully", () => {
    test("it should generate the statement and send the email", async () => {
      const data = {
        categories: ["cat1"],
        currencies: ["NGN"],
        paymentMethods: ["pm1"],
        endDate: { year: 2025, month: "January" },
        startDate: { year: 2002, month: "January" },
      };

      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/statement`)
        .set("Authorization", "Bearer fake-session-id")
        .set("Content-Type", "application/json")
        .send(data);

      expect(findUniqueSession).toHaveBeenCalledWith({
        where: {
          id: "fake-session-id",
        },
        include: {
          user: true,
        },
      });

      expect(findUniqueSession).toHaveBeenCalledTimes(1);

      expect(pdf).toHaveBeenCalledTimes(1);
      expect(setContent).toHaveBeenCalledTimes(1);
      expect(setContent).toHaveBeenCalledWith(expect.any(String));
      expect(newPage).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);

      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith({
        from: "Paytrail <onboarding@paytrail.app>",
        to: userEmail,
        subject: "Your PayTrail Statement",
        html: expect.stringContaining(userName),

        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringContaining("my-paytrail-report-"),
            content: expect.any(String),
          }),
        ]),
      });

      expect(res.body).toEqual({ message: "success" });
    });

    test("it should fail due to invalid post body", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/statement`)
        .set("Authorization", "Bearer fake-session-id")
        .set("Content-Type", "application/json")
        .send({
          categories: [],
          currencies: ["FAKE-CURRENCY"],
          paymentMethods: [],
          endDate: { endYear: 2025, endMonth: "January" },
          startDate: { startYear: 2002, startMonth: "January" },
        });

      expect(findUniqueSession).toHaveBeenCalledWith({
        where: {
          id: "fake-session-id",
        },
        include: {
          user: true,
        },
      });

      expect(findUniqueSession).toHaveBeenCalledTimes(1);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: MESSAGES.BAD_REQUEST });
    });

    test("it should fail because the user is unauthorized", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/statement`)
        .set("Authorization", "Bearer")
        .set("Content-Type", "application/json")
        .send({
          categories: [],
          currencies: ["FAKE-CURRENCY"],
          paymentMethods: [],
          endDate: { year: 2025, month: "January" },
          startDate: { year: 2002, month: "January" },
        });

      expect(findUniqueSession).not.toHaveBeenCalled();

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: MESSAGES.UNAUTHORIZED });
    });
  });
});
