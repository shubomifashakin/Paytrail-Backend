import request from "supertest";

import { API_V1, MESSAGES } from "../../../utils/constants";

import { NextFunction } from "express";
import { Server } from "http";

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

jest.mock("../../../serverEnv", () => ({
  port: "9000",
  allowedOrigins: "*",
  googleClientId: "test-id",
  redis: "redis://localhost:6379",
  googleClientSecret: "test-secret",
  environment: "paytrail-express-backend-test",
  isProduction: true,
  databaseUrl: "postgresql://postgres:postgres_123@localhost:5432/paytrail_postgres",
  baseUrl: "https://test.com",
  appScheme: "paytrail://",
  paytrailStatementSqsQueueUrl: "fake-statement-queue-url",
}));

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

import { server as app, startServer } from "../../../server";

describe("the statement router test", () => {
  let server: Server;

  beforeAll(async () => {
    server = app;

    jest.clearAllMocks();
    await startServer();
  });

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
      endDate: { endYear: 2025, endMonth: "January" },
      startDate: { startYear: 2002, startMonth: "January" },
    };

    const res = await request(server)
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
      MessageBody: expect.stringContaining('"startYear":2002'),
      QueueUrl: "fake-statement-queue-url",
    });

    expect(res.body).toEqual({ message: "success" });
  });

  test("it should fail due to invalid post body", async () => {
    const res = await request(server)
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
    const res = await request(server)
      .post(`${API_V1}/statement`)
      .set("Authorization", "Bearer")
      .set("Content-Type", "application/json")
      .send({
        categories: [],
        currencies: ["FAKE-CURRENCY"],
        paymentMethods: [],
        endDate: { endYear: 2025, endMonth: "January" },
        startDate: { startYear: 2002, startMonth: "January" },
      });

    expect(findUniqueSession).not.toHaveBeenCalled();

    expect(sqsSend).not.toHaveBeenCalled();
    expect(mockSendMessageCommand).not.toHaveBeenCalled();

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: MESSAGES.UNAUTHORIZED });
  });
});
