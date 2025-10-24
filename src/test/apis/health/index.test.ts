import request from "supertest";

import { NextFunction } from "express";

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => {
      next();
    }),
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as any;

import createApp from "../../../app";

describe("Health Router", () => {
  test("GET /health should return a 200 status code", async () => {
    const app = createApp(mockRedis);
    const res = await request(app).get("/health").expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Healthy",
      time: expect.any(String),
    });
  });
});
