import cookieParser from "cookie-parser";
import express from "express";
// import helmet from "helmet";
import morgan from "morgan";
import cors, { CorsOptions } from "cors";

import { Registry, collectDefaultMetrics } from "prom-client";

import { RedisClientType } from "redis";

import createAccountRouter from "./routes/accounts";
import createAuthRouter from "./routes/authRouter";
import createBroadcastsRouter from "./routes/broadcasts";
import createRateRouter from "./routes/ratesRouter";
import createReceiptRouter from "./routes/receiptsRouter";
import createStatementRouter from "./routes/statementRouter";
import createSyncRouter from "./routes/syncRouter";
import healthRouter from "./routes/healthRouter";
import notificationRouter from "./routes/notifications";

import errorMiddleware from "./middlewares/errorMiddleware";
import isAuthorized from "./middlewares/isAuthorized";
import morganToJson from "./middlewares/morgan";
import requestMetrics from "./middlewares/requestMetrics";
import tagRequest from "./middlewares/tagRequest";

import { API_V1 } from "./utils/constants";
import serverEnv from "./serverEnv";
import setupSwagger from "./utils/swagger";

export default function createApp(redisClient: RedisClientType) {
  const app = express();
  const register = new Registry();

  register.setDefaultLabels({
    serviceName: "paytrail-express-backend",
    environment: serverEnv.environment,
  });

  collectDefaultMetrics({ register });

  const corsOptions: CorsOptions = {
    origin:
      serverEnv.environment === "production"
        ? serverEnv.baseUrl
        : ["http://localhost:5173", "exp://*"],
    credentials: true,
  };

  app.set("trust proxy", true);

  // app.use(
  //   helmet({
  //     frameguard: true,
  //     hidePoweredBy: true,
  //     referrerPolicy: { policy: '' },
  //   }),
  // );

  app.use(cors(corsOptions));

  app.use(tagRequest);

  app.use(express.static("public"));

  morgan.token("requestId", (req) => {
    return (req.headers["x-request-id"] as string) || "-";
  });

  app.use(morganToJson());

  app.use(requestMetrics(register));

  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));

  app.use(express.json());

  if (serverEnv.environment === "development") {
    setupSwagger(app);
  }

  app.use(`/health`, healthRouter);

  app.use("/metrics", async (_, res) => {
    res.set("Content-Type", register.contentType);

    const metrics = await register.metrics();

    res.end(metrics);
  });

  app.use(
    `${API_V1}/auth`,
    createAuthRouter({
      redisClient,
    }),
  );

  app.use(`${API_V1}/sync`, createSyncRouter({ redisClient }));

  app.use(`${API_V1}/statements`, isAuthorized, createStatementRouter({ redisClient }));

  app.use(`${API_V1}/notifications`, isAuthorized, notificationRouter({ redisClient }));

  app.use(`${API_V1}/broadcasts`, isAuthorized, createBroadcastsRouter({ redisClient }));

  app.use(`${API_V1}/receipts`, createReceiptRouter({ redisClient, register }));

  app.use(`${API_V1}/accounts`, isAuthorized, createAccountRouter({ redisClient }));

  app.use(`${API_V1}/rates`, createRateRouter({ redisClient }));

  app.use(errorMiddleware(register));

  return app;
}
