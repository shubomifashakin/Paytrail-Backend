import { RedisClientType } from "redis";
import { Router } from "express";
import multer from "multer";

import createRateLimiter from "../middlewares/rateLimiter";
import isAuthorized from "../middlewares/isAuthorized";

import { uploadReceipt } from "../controllers/receiptRouter/uploadReceipt";

const multerConfig = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 1024 * 1024 * 15, fields: 2 },

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

const uploadMiddleware = multerConfig.fields([
  { name: "receipt", maxCount: 4 },
  { name: "pdf", maxCount: 1 },
]);

export default function createReceiptRouter({ redisClient }: { redisClient: RedisClientType }) {
  const router = Router();

  router.post(
    "/upload",
    isAuthorized,
    createRateLimiter({
      redisClient,
      limit: 5,
      window: 60,
      keyGenerator: (req) => `${req.user.id}:${req.path}`,
    }),
    uploadMiddleware,
    uploadReceipt,
  );

  return router;
}
