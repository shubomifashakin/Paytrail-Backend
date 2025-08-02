import { ErrorResponse } from "resend";

import logger from "../lib/logger";

/**
 * Sleeps for a specified number of seconds.
 * @param seconds - The number of seconds to sleep (default is 1).
 * @returns A Promise that resolves after the specified number of seconds.
 */
export async function sleep(seconds: number = 1) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export type FetchResult<T> =
  | {
      data: T;
      success: true;
      error: undefined;
      status: number;
    }
  | {
      data: undefined;
      success: false;
      error: Error;
      status: number;
    };

/**
 * Fetches data from a URL with retry logic.
 *
 * @param url - The URL to fetch data from.
 * @param init - Optional parameters for the fetch request.(ie: headers, body, method, etc.)
 * @param retries - The number of retry attempts (default is 2).
 * @param sleepTimeInSecs - The time to wait between retries (default is 1 second).
 * @param timeoutInSecs - The time to wait before aborting the request (default is 10 seconds).
 * @returns The response status, data if success, error if failed, and success status of the fetch request.
 *
 * @remarks
 * - If the request returns with a status of 429, it would not retry the request at all.
 * - If you pass a signal with your fetch config then the fetch would abort whenever ANY(the first one) of the signal provided and the timeout signal abort.
 *  - If your signal is aborted, then the fetch would not be retried.
 *  - If the timeout signal aborts, then the fetch would be retried.
 */
export async function fetchAndRetry<T>({
  url,
  init,
  retries = 2,
  sleepTimeInSecs = 1,
  timeoutInSecs = 10,
}: {
  url: string;
  init?: RequestInit;
  retries?: number;
  sleepTimeInSecs?: number;
  timeoutInSecs?: number;
}): Promise<FetchResult<T>> {
  let isRateLimited = false;

  let lastError: Error | undefined;
  let lastErrorStatus: number | undefined;

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();

    const signal = init?.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;

    const timeoutId = setTimeout(() => controller.abort(), timeoutInSecs * 1000);

    try {
      const response = await fetch(url, {
        ...init,
        signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        isRateLimited = true;
        break;
      }

      if (!response.ok) {
        lastErrorStatus = response.status;

        const error = (await response.json()) as any;
        const errorMessage =
          error?.Message || error?.message || error?.Error || error?.error || "Unknown error";

        throw new Error(errorMessage);
      }

      const data = (await response.json()) as T;

      return {
        data,
        success: true,
        error: undefined,
        status: response.status,
      };
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      //if the signal passed was aborted, then the request would not be retried
      if (error instanceof DOMException && init?.signal?.aborted) {
        lastError = new Error(`Request was aborted`);

        lastErrorStatus = 408;

        break;
      }

      if (error instanceof DOMException && controller.signal.aborted) {
        lastError = new Error(`Request took too long`);

        lastErrorStatus = 408;
      } else {
        lastError = error as Error;
      }

      logger.warn(`Attempt ${i + 1} to fetch ${url} failed:`, error);

      if (i < retries) {
        await sleep(sleepTimeInSecs);
      }
    }
  }

  if (isRateLimited) {
    return {
      data: undefined,
      success: false,
      error: new Error("Too many requests"),
      status: 429,
    };
  }

  return {
    data: undefined,
    success: false,
    error: lastError || new Error("Failed to fetch data"),
    status: lastErrorStatus || 500,
  };
}

export function logEmailError(
  type: string,
  user: { id: string; email: string },
  error: ErrorResponse,
  req: Request | undefined,
) {
  logger.error(`Failed to send ${type} email`, {
    type,
    url: req?.url,
    method: req?.method,
    name: error.name,
    userId: user.id,
    email: user.email,
    message: error.message,
  });
}
