import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import http from "http";
import morgan from "morgan";
import cors, { CorsOptions } from "cors";

import dotenv from "dotenv";
dotenv.config();

import createAuthRouter from "./routes/authRouter";
import healthRouter from "./routes/healthRouter";
import notificationRouter from "./routes/notifications";
import statementRouter from "./routes/statementRouter";
import syncRouter from "./routes/syncRouter";

import serverEnv from "./serverEnv";

import prisma from "./lib/prisma";
import redisClient from "./lib/redis";
import logger, { loggerProvider } from "./lib/logger";

import createRateLimiter from "./middlewares/rateLimiter";
import errorMiddleware from "./middlewares/errorMiddleware";
import isAuthorized from "./middlewares/isAuthorized";
import morganToJson from "./middlewares/morgan";
import tagRequest from "./middlewares/tagRequest";

import { sleep } from "./utils/fns";
import { API_V1, FORCE_EXIT_TIMEOUT } from "./utils/constants";

const app = express();

const allowedOrigins =
  serverEnv.allowedOrigins === "*" ? serverEnv.allowedOrigins : serverEnv.allowedOrigins.split(",");

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: serverEnv.isProduction,
};

app.set("trust proxy", true);

app.use(helmet());

app.use(tagRequest);

morgan.token("requestId", (req) => {
  return (req.headers["x-request-id"] as string) || "-";
});

app.use(morganToJson());

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());

export const server = http.createServer(app);

export async function startServer() {
  const start = Date.now();
  try {
    logger.info("starting server");

    await redisClient.connect();

    app.use(`/health`, healthRouter);

    app.use(
      `${API_V1}/auth`,
      createAuthRouter({
        signInRateLimiter: createRateLimiter({ redisClient, limit: 5, window: 60 }),
      }),
    );

    app.use(`${API_V1}/sync`, syncRouter);

    app.use(
      `${API_V1}/statement`,
      isAuthorized,
      createRateLimiter({
        redisClient,
        limit: 10,
        window: 10 * 60,
        keyGenerator: (req) => `${req.user.id}:${req.path}`,
      }),
      statementRouter,
    );

    app.use(
      `${API_V1}/notifications`,
      isAuthorized,
      createRateLimiter({
        redisClient,
        limit: 10,
        window: 60,
        keyGenerator: (req) => `${req.user.id}:${req.path}`,
      }),
      notificationRouter,
    );

    app.use(errorMiddleware);

    server.listen(serverEnv.port, () => {
      logger.info(`Server ready on port ${serverEnv.port} (${Date.now() - start} ms)`);
    });
  } catch (error: any) {
    logger.error("Failed to start server", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      duration: `${Date.now() - start}ms`,
    });

    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

async function handleShutdown(signal: string) {
  logger.info(`Received Signal: ${signal} — shutting down`, {
    signal,
  });

  const timeOutId = setTimeout(() => {
    logger.warn("Forcefully exiting due to timeout");
    process.exit(1);
  }, FORCE_EXIT_TIMEOUT);

  try {
    server.closeIdleConnections();

    await new Promise((res, rej) => {
      server.close((error) => {
        if (error) {
          return rej(error);
        }

        logger.info("HTTP server closed");

        res("HTTP server closed");
      });
    });

    logger.info("Closing Postgres connection");
    await prisma.$disconnect();
    logger.info("Postgres connection closed");

    logger.info("Closing Redis connection");
    await redisClient.quit();
    logger.info("Redis connection closed");

    logger.info("Graceful shutdown complete — exiting process.");

    await sleep(0.5);

    await loggerProvider.shutdown();
    clearTimeout(timeOutId);

    process.exit(0);
  } catch (error: any) {
    clearTimeout(timeOutId);

    logger.error("Shutdown error", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });

    process.exit(1);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
