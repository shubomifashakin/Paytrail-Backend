import request from "supertest";

import { RedisClientType } from "redis";

import { API_V1, MESSAGES } from "../../../utils/constants";

import { NextFunction } from "express";

const sqsSend = jest.fn().mockImplementation((command) => {
  return command;
});

const mockSendMessageCommand = jest.fn();
jest.mock("@aws-sdk/client-sqs", () => {
  return {
    SendMessageCommand: mockSendMessageCommand,
    SQSClient: jest.fn().mockImplementation(() => ({
      send: sqsSend,
    })),
  };
});

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

const findUniqueSession = jest.fn().mockResolvedValue({
  user: {
    id: "new-user-id",
  },
});

jest.mock("../../../lib/prisma.ts", () => {
  return {
    session: {
      findUnique: findUniqueSession,
    },
  };
});

import createApp from "../../../app";
import serverEnv from "../../../serverEnv";

describe("the statement router test", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test("it should send the statement request details to the queue", async () => {
    const data = {
      categories: [],
      currencies: [],
      paymentMethods: [],
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

    expect(sqsSend).toHaveBeenCalledTimes(1);
    expect(mockSendMessageCommand).toHaveBeenCalledTimes(1);
    expect(mockSendMessageCommand).toHaveBeenCalledWith({
      MessageBody: expect.stringContaining('"year":2002'),
      QueueUrl: serverEnv.paytrailStatementSqsQueueUrl,
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

    expect(sqsSend).not.toHaveBeenCalled();
    expect(mockSendMessageCommand).not.toHaveBeenCalled();

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

    expect(sqsSend).not.toHaveBeenCalled();
    expect(mockSendMessageCommand).not.toHaveBeenCalled();

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: MESSAGES.UNAUTHORIZED });
  });
});
