import { NextFunction } from "express";
import request from "supertest";

import {
  API_V1,
  GOOGLE_OATH_TOKEN_URL,
  GOOGLE_REDIRECT_URL,
  MESSAGES,
  OAUTH_ERRORS,
} from "../../../utils/constants";

const fakeUUid = "fake-uuid";
jest.mock("uuid", () => ({
  v4: jest.fn().mockReturnValue(fakeUUid),
}));

jest.mock("../../../lib/logger", () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../../middlewares/rateLimiter", () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

jest.mock("../../../serverEnv", () => ({
  port: "4000",
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

const sub = "test-sub";
const name = "Test User";
const email = "test@example.com";
const picture = "https://example.com/test.jpg";

jest.mock("jose", () => ({
  decodeJwt: jest.fn().mockReturnValue({
    email,
    name,
    picture,
    sub,
  }),
}));

const findUnique = jest
  .fn()
  .mockResolvedValue({
    id: fakeUUid,
    name,
    email,
    emailVerified: true,
    image: picture,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .mockResolvedValueOnce(null);

const create = jest.fn().mockResolvedValue({
  id: fakeUUid,
  name,
  email,
  emailVerified: true,
  image: picture,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const createAccount = jest.fn().mockResolvedValue(null);

const createSession = jest.fn().mockResolvedValue({ id: fakeUUid });
const deleteSessions = jest.fn().mockResolvedValue(null);
const deleteSingleSession = jest.fn().mockResolvedValue(null);
const findSession = jest.fn().mockResolvedValue({
  id: fakeUUid,
  name,
  email,
  updatedAt: new Date(),
  createdAt: new Date(),
});

jest.mock("../../../lib/prisma", () => {
  return {
    user: {
      create,
      findUnique,
    },
    account: {
      create: createAccount,
    },
    session: {
      create: createSession,
      findUnique: findSession,
      deleteMany: deleteSessions,
      delete: deleteSingleSession,
    },
  };
});

import { startServer } from "../../../server";

describe("authentication tests", () => {
  beforeAll(async () => {
    await startServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
  });

  test("google sign in authorize request should be successfully redirected", async () => {
    const state = "fake-state";

    const { server } = await import("../../../server");

    const res = await request(server)
      .get(`${API_V1}/auth/google`)
      .query({ redirect_uri: "paytrail://", state });

    expect(res.status).toBe(302);
  });

  test("google sign in authorize request should return status 400, since redirectUri was not sent", async () => {
    const state = "fake-state";

    const { server } = await import("../../../server");

    const res = await request(server).get(`${API_V1}/auth/google`).query({ state });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: OAUTH_ERRORS.GOOGLE.INVALID_REDIRECT_URI,
    });
  });

  test("google sign in authorize request should return status 400, since redirectUri was not the baseUrl or expected scheme", async () => {
    const state = "fake-state";

    const { server } = await import("../../../server");

    const res = await request(server)
      .get(`${API_V1}/auth/google`)
      .query({ state, redirect_uri: "https://fake.com" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: OAUTH_ERRORS.GOOGLE.INVALID_REDIRECT_URI,
    });
  });

  test("google sign in callback should successfully redirect", async () => {
    const { server } = await import("../../../server");

    const res = await request(server)
      .get(`${API_V1}/auth/google/callback`)
      .query({ code: "test-code", state: "mobile|testuuid" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("paytrail://");
  });

  test("google sign in callback should return status 400 since no code was sent", async () => {
    const { server } = await import("../../../server");

    const res = await request(server)
      .get(`${API_V1}/auth/google/callback`)
      .query({ state: "mobile|testuuid" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: OAUTH_ERRORS.GOOGLE.INVALID_CODE,
    });
  });

  test("google sign in callback should return status 400 since no state was sent", async () => {
    const { server } = await import("../../../server");

    const res = await request(server)
      .get(`${API_V1}/auth/google/callback`)
      .query({ code: "test-code" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: OAUTH_ERRORS.GOOGLE.INVALID_STATE,
    });
  });

  test("google sign in token, user should be created and signed in successfully if no account exists", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id_token: "test-id-token" }),
    } as unknown as Response);

    const { server } = await import("../../../server");

    const res = await request(server)
      .post(`${API_V1}/auth/google/token`)
      .set("user-agent", "test-agent")
      .send({ code: "test-code" });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(GOOGLE_OATH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: "test-code",
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URL,
        client_id: "test-id",
        client_secret: "test-secret",
      }),
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        email: "test@example.com",
      },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        id: fakeUUid,
        name,
        email,
        emailVerified: true,
        image: picture,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });

    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(createAccount).toHaveBeenCalledWith({
      data: {
        id: fakeUUid,
        accountId: sub,
        providerId: "google",
        userId: fakeUUid,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith({
      data: {
        id: fakeUUid,
        token: fakeUUid,
        userId: fakeUUid,
        ipAddress: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        userAgent: "test-agent",
        expiresAt: expect.any(Date),
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name,
      userId: fakeUUid,
      email,
      sessionId: fakeUUid,
      profileImage: picture,
      createdAt: expect.any(String),
    });
  });

  test("google sign in token, users previous sessions should be cancelled & signed in successfully if user already exists", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id_token: "test-id-token" }),
    } as unknown as Response);

    const { server } = await import("../../../server");

    const res = await request(server)
      .post(`${API_V1}/auth/google/token`)
      .set("user-agent", "test-agent")
      .send({ code: "test-code" });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(GOOGLE_OATH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: "test-code",
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URL,
        client_id: "test-id",
        client_secret: "test-secret",
      }),
    });

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        email: "test@example.com",
      },
    });

    expect(create).not.toHaveBeenCalled();

    expect(createAccount).not.toHaveBeenCalled();

    expect(deleteSessions).toHaveBeenCalledTimes(1);
    expect(deleteSessions).toHaveBeenCalledWith({
      where: {
        userId: fakeUUid,
      },
    });

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith({
      data: {
        id: fakeUUid,
        token: fakeUUid,
        userId: fakeUUid,
        ipAddress: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        userAgent: "test-agent",
        expiresAt: expect.any(Date),
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name,
      userId: fakeUUid,
      email,
      sessionId: fakeUUid,
      profileImage: picture,
      createdAt: expect.any(String),
    });
  });

  test("google sign in token, should return status 400 since no code was sent", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id_token: "test-id-token" }),
    } as unknown as Response);

    const { server } = await import("../../../server");

    const res = await request(server)
      .post(`${API_V1}/auth/google/token`)
      .set("user-agent", "test-agent")
      .send({ code: null });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: MESSAGES.BAD_REQUEST });
  });

  test("google sign in token, should return status 500 since no id token was provided by google", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id_token: null }),
    } as unknown as Response);

    const { server } = await import("../../../server");

    const res = await request(server)
      .post(`${API_V1}/auth/google/token`)
      .set("user-agent", "test-agent")
      .send({ code: "test-code" });

    expect(res.status).toEqual(500);
    expect(res.body).toEqual({ message: MESSAGES.INTERNAL_SERVER_ERROR });
  });

  test("should sign out successfully", async () => {
    const { server } = await import("../../../server");

    const res = await request(server)
      .post(`${API_V1}/auth/sign-out`)
      .set("user-agent", "test-agent")
      .set("authorization", `Bearer ${fakeUUid}`);

    expect(findSession).toHaveBeenCalledTimes(1);
    expect(findSession).toHaveBeenCalledWith({
      where: {
        id: fakeUUid,
      },
      include: {
        user: true,
      },
    });

    expect(deleteSingleSession).toHaveBeenCalledTimes(1);
    expect(deleteSingleSession).toHaveBeenCalledWith({
      where: {
        id: fakeUUid,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: MESSAGES.SUCCESS });
  });
});
