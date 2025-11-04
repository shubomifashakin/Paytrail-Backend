import { Application } from "express";
import http from "http";

import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import serverEnv from "./serverEnv";

import createApp from "./app";

import logger from "./lib/logger";
import prisma from "./lib/prisma";
import redisClient from "./lib/redis";

import { FORCE_EXIT_TIMEOUT } from "./utils/constants";

class Server {
  private server: http.Server | null = null;
  private app: Application | null = null;

  constructor() {}

  async start() {
    try {
      const redis = await redisClient.connect();
      logger.info("Connected to Redis");

      this.app = createApp(redis);
      this.server = http.createServer(this.app);

      const start = Date.now();

      this.server.listen(serverEnv.port, () => {
        logger.info(`Server ready on port ${serverEnv.port} (${Date.now() - start} ms)`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      await this.stop();
      process.exit(1);
    }
  }

  async stop() {
    const timeOutId = setTimeout(() => {
      logger.warn("Forcefully exiting due to timeout");
      process.exit(1);
    }, FORCE_EXIT_TIMEOUT);

    try {
      if (this.server) {
        this.server.closeIdleConnections();

        await new Promise((resolve, reject) => {
          this.server?.close((error) => {
            if (error) {
              return reject(error);
            }
            logger.info("HTTP server closed");
            resolve("HTTP server closed");
          });
        });
      }

      logger.info("Closing Postgres connection");
      await prisma.$disconnect();
      logger.info("Postgres connection closed");

      logger.info("Closing Redis connection");
      await redisClient.quit();
      logger.info("Redis connection closed");

      clearTimeout(timeOutId);
      logger.info("Graceful shutdown complete — exiting process.");
      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown:", error);
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();

process.on("SIGINT", () => server.stop());
process.on("SIGTERM", () => server.stop());
