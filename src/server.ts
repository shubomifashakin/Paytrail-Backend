import { Application } from "express";
import http from "http";

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import serverEnv from "./serverEnv";

import createApp from "./app";

import prisma from "./lib/prisma";
import redisClient from "./lib/redis";
import logger, { loggerProvider } from "./lib/logger";

import { FORCE_EXIT_TIMEOUT } from "./utils/constants";
import { sleep } from "./utils/fns";

class Server {
  private server;

  constructor(app: Application) {
    this.server = http.createServer(app);
  }

  start() {
    const start = Date.now();
    this.server.listen(serverEnv.port, () => {
      logger.info(`Server ready on port ${serverEnv.port} (${Date.now() - start} ms)`);
    });
  }

  async stop() {
    const timeOutId = setTimeout(() => {
      logger.warn("Forcefully exiting due to timeout");
      process.exit(1);
    }, FORCE_EXIT_TIMEOUT);

    this.server.closeIdleConnections();

    await new Promise((res, rej) => {
      this.server.close((error) => {
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
  }
}

redisClient
  .connect()
  .then((redis) => {
    logger.info("Connected to Redis");
    const app = createApp(redis);
    const server = new Server(app);

    server.start();

    process.on("SIGINT", () => server.stop());
    process.on("SIGTERM", () => server.stop());
  })
  .catch((error) => {
    logger.error("Failed to connect to Redis:", error);
    process.exit(1);
  });
