import { NextFunction } from "express";
import { RedisClientType } from "redis";
import path from "path";
import request from "supertest";

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => {
      next();
    }),
}));

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "parsed-user",
  },
});

jest.mock("../../../lib/prisma", () => {
  return {
    session: {
      findUnique: findUniqueSession,
    },
  };
});

jest.mock("../../../lib/receiptParser", () => {
  return {
    ReceiptParser: jest.fn().mockImplementation(() => ({
      parse: jest.fn().mockResolvedValue({
        object: { total: 100, currency: "USD" },
        finishReason: "stop",
        warnings: [],
        usage: {},
        timeTaken: 1,
      }),
    })),
  };
});

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

import { API_V1 } from "../../../utils/constants";
import createApp from "../../../app";

describe("parseReceipts", () => {
  it("parses a receipt with file + metadata", async () => {
    const formData = new FormData();
    formData.append("receipt", {
      uri: path.join(__dirname, "../../fixtures/test-receipt.png"),
      type: "image/png",
      name: "test-receipt.png",
    });
    formData.append("paymentMethods", JSON.stringify([{ id: "pm1", description: "Card" }]));
    formData.append("categories", JSON.stringify([{ id: "cat1", description: "Food" }]));

    const res = await request(createApp(mockRedis))
      .post(`${API_V1}/receipts/parse`)
      .set("Authorization", "Bearer parsed-user")
      .send(formData);

    expect(res.status).toBe(200);
  });
});
