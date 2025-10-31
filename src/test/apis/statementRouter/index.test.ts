import request from "supertest";
import { v4 as uuid } from "uuid";

import { RedisClientType } from "redis";

import { API_V1, MESSAGES } from "../../../utils/constants";

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
const bringToFront = jest.fn().mockResolvedValue(undefined);
const pdf = jest.fn().mockResolvedValue(Buffer.from("PDF_CONTENT"));
const newPage = jest.fn().mockResolvedValue({
  pdf,
  setContent,
  bringToFront,
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
import prisma from "../../../lib/prisma";

describe("Statement Router", () => {
  let sessionId: string;
  let userId: string;
  let userName: string;
  let userEmail: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        currency: "USD",
        email: "statement@example.com",
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
        token: "statement-token",
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
    userName = user.name;
    userEmail = user.email;
  });

  afterAll(async () => {
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

    await prisma.budgets.deleteMany({
      where: {
        userId: userId,
      },
    });
    await prisma.transactions.deleteMany({
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

    jest.clearAllMocks();
    jest.resetModules();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("POST /statements", () => {
    describe("when there are budgets", () => {
      let payId: string;
      let categoryId: string;

      beforeAll(async () => {
        const payId2 = await prisma.paymentMethods.create({
          data: {
            id: uuid(),
            name: "pm1",
            color: "#000000",
            emoji: "",
            description: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: userId,
          },
          select: { id: true },
        });

        const categoryId2 = await prisma.categories.create({
          data: {
            id: uuid(),
            name: "cat1",
            color: "#000000",
            emoji: "",
            description: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: userId,
          },
          select: { id: true },
        });

        const budgetId = await prisma.budgets.create({
          data: {
            id: uuid(),
            userId: userId,
            amount: 100,
            currency: "NGN",
            createdAt: new Date(),
            updatedAt: new Date(),
            year: 2025,
            budgetMonth: "January",
            period: 202500,
          },
          select: { id: true },
        });

        await prisma.transactions.createMany({
          data: [
            {
              id: uuid(),
              userId: userId,
              amount: 100,
              currency: "NGN",
              createdAt: new Date(),
              updatedAt: new Date(),
              note: "transaction 1",
              transactionType: "expense",
              paymentMethodId: payId2.id,
              categoryId: categoryId2.id,
              budgetId: budgetId.id,
              transactionDate: new Date(),
            },
            {
              id: uuid(),
              userId: userId,
              amount: 100,
              currency: "NGN",
              createdAt: new Date(),
              updatedAt: new Date(),
              note: "transaction 1",
              transactionType: "income",
              paymentMethodId: payId2.id,
              categoryId: categoryId2.id,
              budgetId: budgetId.id,
              transactionDate: new Date(),
            },
          ],
        });

        payId = payId2.id;
        categoryId = categoryId2.id;
      });

      test("it should generate the budget statement and send the email", async () => {
        const data = {
          categories: [],
          currencies: [],
          paymentMethods: [],
          statementType: "budgets",
          endDate: { year: 2025, month: "January" },
          startDate: { year: 2002, month: "January" },
        };

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/statements`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send(data);

        expect(newPage).toHaveBeenCalledTimes(1);
        expect(bringToFront).toHaveBeenCalledTimes(1);
        expect(setContent).toHaveBeenCalledTimes(1);
        expect(setContent).toHaveBeenCalledWith(expect.any(String));
        expect(pdf).toHaveBeenCalledTimes(1);
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
            categories: [categoryId],
            currencies: ["NGN"],
            paymentMethods: [payId],
            statementType: "budgets",
            endDate: { year: 2025, month: "January" },
            startDate: { year: 2002, month: "January" },
          };

          const res = await request(createApp(mockRedis))
            .post(`${API_V1}/statements`)
            .set("Authorization", `Bearer ${sessionId}`)
            .set("Content-Type", "application/json")
            .send(data);

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
      beforeAll(async () => {
        await prisma.budgets.deleteMany();
        await prisma.categories.deleteMany();
        await prisma.paymentMethods.deleteMany();
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
          .post(`${API_V1}/statements`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send(data);

        expect(sendMail).not.toHaveBeenCalled();

        expect(res.status).toBe(404);
      });
    });

    describe("when there are transactions", () => {
      let payId: string;
      let categoryId: string;
      const startDate = new Date();

      beforeAll(async () => {
        await prisma.transactions.deleteMany();

        const payId2 = await prisma.paymentMethods.create({
          data: {
            id: uuid(),
            name: "pm1",
            color: "#000000",
            emoji: "",
            description: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: userId,
          },
          select: { id: true },
        });

        const categoryId2 = await prisma.categories.create({
          data: {
            id: uuid(),
            name: "cat1",
            color: "#000000",
            emoji: "",
            description: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: userId,
          },
          select: { id: true },
        });

        await prisma.transactions.create({
          data: {
            id: uuid(),
            userId: userId,
            amount: 100,
            currency: "NGN",
            createdAt: new Date(),
            updatedAt: new Date(),
            note: "transaction 1",
            transactionType: "expense",
            paymentMethodId: payId2.id,
            categoryId: categoryId2.id,
            transactionDate: startDate,
          },
          select: { id: true },
        });

        payId = payId2.id;
        categoryId = categoryId2.id;
      });

      test("it should generate the statement and send the email", async () => {
        const data = {
          categories: [categoryId],
          currencies: ["NGN"],
          paymentMethods: [payId],
          statementType: "transactions",
          endDate: new Date(),
          startDate: startDate,
        };

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/statements`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send(data);

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
            categories: [categoryId],
            currencies: ["NGN"],
            paymentMethods: [payId],
            statementType: "transactions",
            endDate: new Date(),
            startDate: startDate,
          };

          const res = await request(createApp(mockRedis))
            .post(`${API_V1}/statements`)
            .set("Authorization", `Bearer ${sessionId}`)
            .set("Content-Type", "application/json")
            .send(data);

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

    describe("when there are no transactions", () => {
      beforeAll(async () => {
        await prisma.transactions.deleteMany();
      });

      test("it should not generate the statement ", async () => {
        const data = {
          categories: [""],
          currencies: ["NGN"],
          paymentMethods: [""],
          statementType: "transactions",
          endDate: new Date(),
          startDate: new Date(),
        };

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/statements`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send(data);

        expect(sendMail).not.toHaveBeenCalled();

        expect(res.status).toBe(404);
      });
    });

    describe("authorization", () => {
      test("it should fail due to invalid post body", async () => {
        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/statements`)
          .set("Authorization", `Bearer ${sessionId}`)
          .set("Content-Type", "application/json")
          .send({
            categories: [],
            currencies: ["FAKE-CURRENCY"],
            paymentMethods: [],
            endDate: { endYear: 2025, endMonth: "January" },
            startDate: { startYear: 2002, startMonth: "January" },
          });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: MESSAGES.BAD_REQUEST });
      });

      test("it should fail because the user is unauthorized", async () => {
        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/statements`)
          .set("Authorization", "Bearer")
          .set("Content-Type", "application/json")
          .send({
            categories: [],
            currencies: ["FAKE-CURRENCY"],
            paymentMethods: [],
            endDate: { year: 2025, month: "January" },
            startDate: { year: 2002, month: "January" },
          });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ message: MESSAGES.UNAUTHORIZED });
      });
    });
  });
});
