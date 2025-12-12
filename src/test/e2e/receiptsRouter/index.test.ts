import { RedisClientType } from "redis";
import request from "supertest";

import { v4 as uuid } from "uuid";

const parse = jest.fn().mockResolvedValue({
  object: { total: 100, currency: "USD" },
  finishReason: "stop",
  warnings: [],
  usage: {},
  timeTaken: 1,
});

const receiptParser = jest.fn().mockImplementation(() => ({
  parse: parse,
}));

jest.mock("../../../lib/receiptParser", () => {
  return {
    ReceiptParser: receiptParser,
  };
});

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

import { API_V1 } from "../../../utils/constants";
import createApp from "../../../app";
import prisma from "../../../lib/prisma";

describe("Receipts Router", () => {
  let sessionId: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        name: "Test User",
        currency: "USD",
        email: "receipts@example.com",
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
        token: "receipt-token",
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

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("POST /receipts/parse", () => {
    describe("when everything is ok", () => {
      it("parses the receipt", async () => {
        const receiptBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          "base64",
        );

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/receipts/parse`)
          .set("Authorization", `Bearer ${sessionId}`)
          .attach("receipt", receiptBuffer, "test-file.png")
          .field("paymentMethods", JSON.stringify([{ id: "pm1", description: "Card" }]))
          .field("categories", JSON.stringify([{ id: "cat1", description: "Food" }]));

        expect(res.status).toBe(200);
      });
    });

    describe("when there are request errors", () => {
      it("it should fail due to incorrect metadata schema", async () => {
        const receiptBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          "base64",
        );

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/receipts/parse`)
          .set("Authorization", `Bearer ${sessionId}`)
          .attach("receipt", receiptBuffer, "test-file.png")
          .field("paymentMethods", JSON.stringify([{}]))
          .field("categories", JSON.stringify([{}]));

        expect(res.status).toBe(400);
      });

      it("it should fail because no image was sent", async () => {
        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/receipts/parse`)
          .set("Authorization", `Bearer ${sessionId}`)
          .field("paymentMethods", JSON.stringify([{ id: "pm1", description: "Card" }]))
          .field("categories", JSON.stringify([{ id: "cat1", description: "Food" }]));

        expect(res.status).toBe(400);
      });

      it("it should fail because unsupported filetype was sent", async () => {
        const receiptBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          "base64",
        );

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/receipts/parse`)
          .set("Authorization", `Bearer ${sessionId}`)
          .attach("receipt", receiptBuffer, "test-file.txt")
          .field("paymentMethods", JSON.stringify([{ id: "pm1", description: "Card" }]))
          .field("categories", JSON.stringify([{ id: "cat1", description: "Food" }]));

        expect(res.status).toBe(500);
      });
    });

    describe("when the ai sdk has some errors", () => {
      beforeAll(async () => {
        parse.mockResolvedValueOnce({
          object: { total: 100, currency: "USD" },
          finishReason: "error",
          warnings: ["warning-1"],
          usage: {},
          timeTaken: 1,
        });
      });

      it("it should return a 500 error", async () => {
        const receiptBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          "base64",
        );

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/receipts/parse`)
          .set("Authorization", `Bearer ${sessionId}`)
          .attach("receipt", receiptBuffer, "test-file.png")
          .field("paymentMethods", JSON.stringify([{ id: "pm1", description: "Card" }]))
          .field("categories", JSON.stringify([{ id: "cat1", description: "Food" }]));

        expect(res.status).toBe(500);
      });
    });
  });
});
