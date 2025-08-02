import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import http from "http";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import cors, { CorsOptions } from "cors";

import dotenv from "dotenv";
dotenv.config();

import healthRouter from "./routes/healthRouter";

import serverEnv from "./serverEnv";

import auth from "./lib/auth";
import prisma from "./lib/prisma";
import redisClient from "./lib/redis";
import logger, { loggerProvider } from "./lib/logger";

// import createRateLimiter from "./middlewares/rateLimiters";
import errorMiddleware from "./middlewares/errorMiddleware";
// import isAuthorized from "./middlewares/isAuthorized";
import morganToJson from "./middlewares/morgan";
import tagRequest from "./middlewares/tagRequest";

import { FORCE_EXIT_TIMEOUT } from "./utils/constants";
import { sleep } from "./utils/fns";

const app = express();

const allowedOrigins =
  serverEnv.allowedOrigins === "*" ? serverEnv.allowedOrigins : serverEnv.allowedOrigins.split(",");

//configure to your project needs
const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: serverEnv.isProduction,
};

//configure to your needs (i.e you might want to limit to specific ips)
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

app.use(`/health`, healthRouter);

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());

app.use(errorMiddleware);

export const server = http.createServer(app);

async function startServer() {
  const start = Date.now();
  try {
    logger.info("starting server");

    await redisClient.connect();

    //routes that require rate limiting come here e.g
    // app.use(`${API_V1}/example`, createRateLimiter({redisClient,limit: 5,window: 60}), exampleRouter);

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

//prevents the test from trying to start the server
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
