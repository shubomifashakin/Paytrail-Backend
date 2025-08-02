import { ErrorResponse } from "resend";
import { Logger } from "winston";

import logger from "../../lib/logger";
import { fetchAndRetry, sleep } from "../../utils/fns";

describe("test for all the util functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(logger, "warn").mockImplementation(() => null as unknown as Logger);
    jest.spyOn(logger, "error").mockImplementation(() => null as unknown as Logger);
    jest.spyOn(global, "setTimeout");

    global.fetch = jest.fn();
  });

  test("should wait for specified seconds", async () => {
    const seconds = 2;
    const sleepPromise = sleep(seconds);

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), seconds * 1000);

    jest.runOnlyPendingTimers();

    await expect(sleepPromise).resolves.toBeUndefined();
  });

  test("it should return a success response", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1 }),
    } as unknown as Response);

    const response = await fetchAndRetry<{
      id: number;
    }>({
      url: "fake url",
      retries: 2,
    });

    expect(mockedFetch).toHaveBeenCalledWith("fake url", {
      signal: expect.any(AbortSignal),
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(response.success).toBeTruthy();
    expect(response.error).toBeFalsy();
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ id: 1 });
  });

  test("it should return a 500 error due to multiple failed retry attempts", async () => {
    jest.spyOn(global, "setTimeout").mockImplementation((fn) => {
      (fn as () => void)();
      return 0 as unknown as NodeJS.Timeout;
    });

    const mockedFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          error: "Server error",
        }),
    });
    global.fetch = mockedFetch;

    const response = await fetchAndRetry<{
      id: number;
    }>({
      url: "fake url",
      retries: 2,
    });

    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(response.success).toBeFalsy();
    expect(response.status).toBe(500);
    expect(response.error?.message).toBe("Server error");
  });

  test("it should retrun a 429 error due to rate limiting", async () => {
    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    mockedFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: "Rate limited",
        }),
    } as unknown as Response);

    const response = await fetchAndRetry<{
      id: number;
    }>({
      url: "fake url",
      retries: 2,
    });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(response.success).toBeFalsy();
    expect(response.status).toBe(429);
    expect(response.error?.message).toBe("Too many requests");
  });

  test("it should return a 408 error due to timeout", async () => {
    jest.spyOn(global, "setTimeout").mockImplementation((fn) => {
      (fn as () => void)();
      return 1 as unknown as NodeJS.Timeout;
    });

    jest.spyOn(global, "clearTimeout");

    const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockedFetch.mockRejectedValue(new DOMException());

    const { fetchAndRetry } = await import("../../utils/fns");

    const response = await fetchAndRetry<{
      id: number;
    }>({
      url: "fake url",
      retries: 2,
      timeoutInSecs: 10,
    });

    expect(mockedFetch).toHaveBeenCalledWith("fake url", {
      signal: expect.any(AbortSignal),
    });
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(clearTimeout).toHaveBeenCalledTimes(3);

    expect(setTimeout).toHaveBeenCalledTimes(5); //3 times for each retry and 2 times for the sleep

    expect(logger.warn).toHaveBeenCalledTimes(3);

    expect(response.success).toBeFalsy();
    expect(response.status).toBe(408);
    expect(response.error?.message).toBe("Request took too long");
  });

  test("it should log the mail error", async () => {
    const { logEmailError } = await import("../../utils/fns");

    const user = {
      id: "test-id",
      email: "test@example.com",
    };

    const error: ErrorResponse = {
      message: "Invalid request",
      name: "application_error",
    };

    const request = {
      method: "POST",
      url: "https://example.com",
    } as Request;

    logEmailError("test", user, error, request);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(`Failed to send test email`, {
      type: "test",
      url: request.url,
      method: request.method,
      name: error.name,
      userId: user.id,
      email: user.email,
      message: error.message,
    });
  });
});
