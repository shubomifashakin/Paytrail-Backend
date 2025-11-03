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

jest.mock("prom-client", () => {
  const mockObserve = jest.fn();
  const mockInc = jest.fn();
  const mockStartTimer = jest.fn(() => jest.fn());

  return {
    Registry: jest.fn().mockImplementation(() => ({
      registerMetric: jest.fn(),
      setDefaultLabels: jest.fn(),
      contentType: "text/plain",
      metrics: jest.fn(),
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      observe: mockObserve,
      startTimer: mockStartTimer,
    })),
    Counter: jest.fn().mockImplementation(() => ({
      inc: mockInc,
    })),
    collectDefaultMetrics: jest.fn(),
  };
});
