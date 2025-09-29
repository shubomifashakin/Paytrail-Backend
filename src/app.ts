import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors, { CorsOptions } from "cors";

import { RedisClientType } from "redis";

import createAuthRouter from "./routes/authRouter";
import createBroadcastsRouter from "./routes/broadcasts";
import createReceiptRouter from "./routes/receiptsRouter";
import createStatementRouter from "./routes/statementRouter";
import healthRouter from "./routes/healthRouter";
import notificationRouter from "./routes/notifications";
import syncRouter from "./routes/syncRouter";

import errorMiddleware from "./middlewares/errorMiddleware";
import isAuthorized from "./middlewares/isAuthorized";
import morganToJson from "./middlewares/morgan";
import tagRequest from "./middlewares/tagRequest";

import { API_V1 } from "./utils/constants";
import serverEnv from "./serverEnv";

export default function createApp(redisClient: RedisClientType) {
  const app = express();

  const corsOptions: CorsOptions = {
    origin:
      serverEnv.environment === "production"
        ? serverEnv.baseUrl
        : ["http://localhost:5173", "exp://*"],
    credentials: true,
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

  app.use(`/health`, healthRouter);

  app.use(
    `${API_V1}/auth`,
    createAuthRouter({
      redisClient,
    }),
  );

  app.use(`${API_V1}/sync`, syncRouter);

  app.use(`${API_V1}/statement`, isAuthorized, createStatementRouter({ redisClient }));

  app.use(`${API_V1}/notifications`, isAuthorized, notificationRouter({ redisClient }));

  app.use(`${API_V1}/broadcasts`, isAuthorized, createBroadcastsRouter({ redisClient }));

  app.use(`${API_V1}/receipts`, createReceiptRouter({ redisClient }));

  app.use(errorMiddleware);

  return app;
}
