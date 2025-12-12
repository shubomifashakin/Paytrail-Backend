/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";

const config: Config = {
  bail: 10,

  clearMocks: false,

  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/vendor/**",
    "!prisma/**/*",
    "!test/**/*",
  ],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: ["\\\\node_modules\\\\", "\\\\src\\\\server.ts"],
  coverageProvider: "v8",

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      // statements: -10,
    },
  },

  displayName: {
    name: "Paytrail-Express-Server",
    color: "cyan",
  },

  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "mts", "cts", "tsx", "json", "node"],

  modulePathIgnorePatterns: ["<rootDir>/src/server.ts"],

  preset: "ts-jest",

  roots: ["<rootDir>/src/test"],

  setupFiles: ["<rootDir>/jest.setup.ts"],

  slowTestThreshold: 5,

  testEnvironment: "node",

  testMatch: ["**/src/test/**/*.test.ts"],

  testPathIgnorePatterns: ["\\\\node_modules\\\\"],

  testTimeout: 20000,

  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  transformIgnorePatterns: ["/node_modules/(?!(jose|uuid)/)"],

  verbose: true,
};

export default config;
