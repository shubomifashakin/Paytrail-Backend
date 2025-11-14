import { NextFunction } from "express";
import request from "supertest";

import { RedisClientType } from "redis";

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

const sub = "test-sub";
const name = "Test User";
const email = "test@example.com";
const picture = "https://example.com/test.jpg";

jest.mock("jose", () => ({
  decodeJwt: jest.fn().mockReturnValue({
    name,
    email,
    picture,
    sub,
  }),
}));

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as unknown as RedisClientType;

const createContact = jest.fn().mockResolvedValue({
  error: null,
});
const resend = jest.fn().mockImplementation(() => ({
  contacts: {
    create: createContact,
  },
}));
jest.mock("resend", () => ({
  Resend: resend,
}));

import createApp from "../../../app";
import serverEnv from "../../../serverEnv";

import prisma from "../../../lib/prisma";

describe("Auth Router", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: fakeUUid,
      },
    });
    await prisma.account.deleteMany({
      where: {
        id: fakeUUid,
      },
    });
    await prisma.session.deleteMany({
      where: {
        id: fakeUUid,
      },
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    global.fetch = jest.fn();
  });

  describe("Google Oauth", () => {
    describe("GET /auth/google/authorize", () => {
      test("google sign in authorize request should be successfully redirected", async () => {
        const state = "fake-state";

        const res = await request(createApp(mockRedis))
          .get(`${API_V1}/auth/google/authorize`)
          .query({ redirect_uri: serverEnv.appScheme, state });

        expect(res.status).toBe(302);
      });

      test("google sign in authorize request should return status 400, since redirectUri was not sent", async () => {
        const state = "fake-state";

        const res = await request(createApp(mockRedis))
          .get(`${API_V1}/auth/google/authorize`)
          .query({ state });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: OAUTH_ERRORS.GOOGLE.INVALID_REDIRECT_URI,
        });
      });

      test("google sign in authorize request should return status 400, since redirectUri was not the baseUrl or expected scheme", async () => {
        const state = "fake-state";

        const res = await request(createApp(mockRedis))
          .get(`${API_V1}/auth/google/authorize`)
          .query({ state, redirect_uri: "https://fake.com" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: OAUTH_ERRORS.GOOGLE.INVALID_REDIRECT_URI,
        });
      });
    });

    describe("GET /auth/google/callback", () => {
      test("google sign in callback should successfully redirect", async () => {
        const res = await request(createApp(mockRedis))
          .get(`${API_V1}/auth/google/callback`)
          .query({ code: "test-code", state: "mobile|testuuid" });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain(serverEnv.appScheme);
      });

      test("google sign in callback should return status 400 since no code was sent", async () => {
        const res = await request(createApp(mockRedis))
          .get(`${API_V1}/auth/google/callback`)
          .query({ state: "mobile|testuuid" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: OAUTH_ERRORS.GOOGLE.INVALID_CODE,
        });
      });

      test("google sign in callback should return status 400 since no state was sent", async () => {
        const res = await request(createApp(mockRedis))
          .get(`${API_V1}/auth/google/callback`)
          .query({ code: "test-code" });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          message: OAUTH_ERRORS.GOOGLE.INVALID_STATE,
        });
      });
    });

    describe("POST /auth/google/token", () => {
      test("user should be created and signed in successfully if no account exists", async () => {
        const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

        mockedFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id_token: "test-id-token" }),
        } as unknown as Response);

        const res = await request(createApp(mockRedis))
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
            client_id: serverEnv.googleClientId!,
            client_secret: serverEnv.googleClientSecret!,
          }),
        });

        expect(res.status).toBe(200);
      });

      test("users previous sessions should be cancelled & signed in successfully if user already exists", async () => {
        const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

        mockedFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id_token: "test-id-token" }),
        } as unknown as Response);

        const res = await request(createApp(mockRedis))
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
            client_id: serverEnv.googleClientId!,
            client_secret: serverEnv.googleClientSecret!,
          }),
        });

        expect(res.status).toBe(200);
      });

      test("should return status 400 since no code was sent", async () => {
        const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

        mockedFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id_token: "test-id-token" }),
        } as unknown as Response);

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/auth/google/token`)
          .set("user-agent", "test-agent")
          .send({ code: null });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: MESSAGES.BAD_REQUEST });
      });

      test("should return status 500 since no id token was provided by google", async () => {
        const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

        mockedFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id_token: null }),
        } as unknown as Response);

        const res = await request(createApp(mockRedis))
          .post(`${API_V1}/auth/google/token`)
          .set("user-agent", "test-agent")
          .send({ code: "test-code" });

        expect(res.status).toEqual(500);
        expect(res.body).toEqual({ message: MESSAGES.INTERNAL_SERVER_ERROR });
      });
    });
  });

  describe("Sign Out", () => {
    test("should sign out successfully", async () => {
      const res = await request(createApp(mockRedis))
        .post(`${API_V1}/auth/sign-out`)
        .set("user-agent", "test-agent")
        .set("authorization", `Bearer ${fakeUUid}`);

      const sessions = await prisma.session.findMany({
        where: { id: fakeUUid },
      });

      expect(sessions).toHaveLength(0);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: MESSAGES.SUCCESS });
    });
  });
});
