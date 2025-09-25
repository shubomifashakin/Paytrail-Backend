import serverEnv from "../serverEnv";

export const FORCE_EXIT_TIMEOUT = 10000;

export enum MESSAGES {
  UNAUTHORIZED = "Unauthorized",
  FORBIDDEN = "Forbidden",
  NOT_FOUND = "Not Found",
  BAD_REQUEST = "Bad Request",
  INTERNAL_SERVER_ERROR = "Internal Server Error",
  SERVICE_UNAVAILABLE = "Service Unavailable",
  GATEWAY_TIMEOUT = "Gateway Timeout",
  REQUEST_TIMEOUT = "Request Timeout",
  TOO_MANY_REQUESTS = "Too Many Requests",
  SUCCESS = "Success",
  AI_GENERATION_ENDED = "AI Generation Did Not Complete",
  AI_GENERATION_WARNINGS = "AI Generation Warnings",
  AI_GENERATION_USAGE = "AI Generation Usage",
  AI_GENERATION_ERROR = "AI Generation Error",
}

export const API_V1 = "/api/v1";

export const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OATH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REDIRECT_URL = `${serverEnv.baseUrl}${API_V1}/auth/google/callback`;

export const SESSION_EXPIRY = 60 * 60 * 24 * 7;

export const OAUTH_ERRORS = {
  GOOGLE: {
    INVALID_CODE: "Invalid code",
    INVALID_STATE: "Invalid state",
    INVALID_REDIRECT_URI: "Invalid redirect_uri",
  },
};

export const GOOGLE_SIGN_IN_ERROR = "GoogleSignInError:";
export const GOOGLE_TOKEN_ERROR = "GoogleTokenError:";
