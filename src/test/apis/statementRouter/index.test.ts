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

const findManyBudgets = jest.fn().mockResolvedValue([
  {
    year: 2025,
    amount: new Decimal(100),
    budgetMonth: "January",
    currency: "USD",
    id: "budget-id",
  },
]);

const findManyLogs = jest.fn().mockResolvedValue([
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
]);

jest.mock("../../../lib/prisma.ts", () => {
  return {
    session: {
      findUnique: findUniqueSession,
    },
    budgets: {
      findMany: findManyBudgets,
    },
    logs: {
      findMany: findManyLogs,
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

  describe("when there are budgets", () => {
    test("it should generate the budget statement and send the email", async () => {
      const data = {
        categories: ["cat1"],
        currencies: ["NGN"],
        paymentMethods: ["pm1"],
        statementType: "budgets",
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
        from: expect.stringContaining("Paytrail"),
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

    describe("when mailing fails", () => {
      beforeEach(() => {
        sendMail.mockResolvedValueOnce({
          error: new Error("mailing failed"),
        });
      });

      test("it should not send the mail", async () => {
        const data = {
          categories: ["cat1"],
          currencies: ["NGN"],
          paymentMethods: ["pm1"],
          statementType: "budgets",
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
          from: expect.stringContaining("Paytrail"),
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

        expect(res.statusCode).toEqual(500);
      });
    });
  });

  describe("when there are no budgets", () => {
    beforeEach(() => {
      findManyBudgets.mockResolvedValue([]);
    });

    test("it should not generate the budget statement", async () => {
      const data = {
        categories: ["cat1"],
        currencies: ["NGN"],
        paymentMethods: ["pm1"],
        statementType: "budgets",
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

      expect(sendMail).not.toHaveBeenCalled();

      expect(res.status).toBe(404);
    });
  });

  describe("when there are logs", () => {
    beforeEach(() => {
      findManyLogs.mockResolvedValue([
        {
          amount: new Decimal(100),
          currency: "NGN",
          transactionDate: new Date(),
          note: "log1",
          logType: "expense",
          paymentMethod: {
            name: "pm1",
          },
          categoryId: "category1",
        },
      ]);
    });

    test("it should generate the statement and send the email", async () => {
      const data = {
        categories: ["cat1"],
        currencies: ["NGN"],
        paymentMethods: ["pm1"],
        statementType: "logs",
        endDate: new Date(),
        startDate: new Date(),
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

      expect(findManyBudgets).not.toHaveBeenCalled();

      expect(findManyLogs).toHaveBeenCalledTimes(1);

      expect(pdf).toHaveBeenCalledTimes(1);
      expect(setContent).toHaveBeenCalledTimes(1);
      expect(setContent).toHaveBeenCalledWith(expect.any(String));
      expect(newPage).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);

      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith({
        from: expect.stringContaining("Paytrail"),
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

    describe("when mailing fails", () => {
      beforeEach(() => {
        sendMail.mockResolvedValueOnce({
          error: new Error("mailing failed"),
        });
      });

      test("it should generate the statement and send the email", async () => {
        const data = {
          categories: ["cat1"],
          currencies: ["NGN"],
          paymentMethods: ["pm1"],
          statementType: "logs",
          endDate: new Date(),
          startDate: new Date(),
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

        expect(findManyBudgets).not.toHaveBeenCalled();

        expect(findManyLogs).toHaveBeenCalledTimes(1);

        expect(pdf).toHaveBeenCalledTimes(1);
        expect(setContent).toHaveBeenCalledTimes(1);
        expect(setContent).toHaveBeenCalledWith(expect.any(String));
        expect(newPage).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(1);

        expect(sendMail).toHaveBeenCalledTimes(1);
        expect(sendMail).toHaveBeenCalledWith({
          from: expect.stringContaining("Paytrail"),
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

        expect(res.statusCode).toEqual(500);
      });
    });
  });

  describe("when there are no logs", () => {
    beforeEach(() => {
      findManyLogs.mockResolvedValue([]);
    });

    test("it should not generate the statement ", async () => {
      const data = {
        categories: ["cat1"],
        currencies: ["NGN"],
        paymentMethods: ["pm1"],
        statementType: "logs",
        endDate: new Date(),
        startDate: new Date(),
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

      expect(findManyBudgets).not.toHaveBeenCalled();

      expect(findManyLogs).toHaveBeenCalledTimes(1);

      expect(sendMail).not.toHaveBeenCalled();

      expect(res.status).toBe(404);
    });
  });

  describe("authorization", () => {
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
