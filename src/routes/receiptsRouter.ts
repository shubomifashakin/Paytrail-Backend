import { RedisClientType } from "redis";
import { Router } from "express";
import multer from "multer";

import createRateLimiter from "../middlewares/rateLimiter";
import isAuthorized from "../middlewares/isAuthorized";

import { uploadReceipt } from "../controllers/receiptRouter/uploadReceipt";

const multerConfig = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 1024 * 1024 * 15, fields: 5 },

  fileFilter: (_, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const uploadMiddleware = multerConfig.array("receipt", 4);

export default function createReceiptRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.post(
    "/parse",
    isAuthorized,
    createRateLimiter({
      redisClient,
      limit: 2, //FIXME: INCREASE ONLY WHEN WE LEAVE FREE PLAN
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    uploadMiddleware,
    uploadReceipt,
  );

  return router;
}
