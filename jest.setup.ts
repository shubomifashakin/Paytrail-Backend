import dotenv from "dotenv";
dotenv.config({ path: "./.env.test" });

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));
