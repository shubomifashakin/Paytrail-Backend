import dotenv from "dotenv";
dotenv.config({ path: "./.env.test" });

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));

jest.mock("./src/lib/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
