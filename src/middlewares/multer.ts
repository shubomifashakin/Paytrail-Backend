import { Request } from "express";
import multer from "multer";

const uploadImagesMiddleware = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 1024 * 1024 * 3.5, //change to the max file size and fields you want
    fields: 2,
  },

  fileFilter: (_, file, cb) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

export const uploadMiddleware = uploadImagesMiddleware.array("images", 2); // Allow up to 2 files

/**
 * clears file buffers from memory.
 *
 * @remarks
 * - u can call this after processing the files uploaded when using Multer's memory storage
 * - Handles both single file (`req.file`) and multiple files (`req.files`)
 * - Replaces file buffers with empty buffers to free up memory
 *
 * @param req - The express request object containing the files uploaded
 */
export function clearBuffer(req: Request) {
  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      if (file.buffer) {
        file.buffer = Buffer.alloc(0);
      }
    });
  }

  if (req.file) {
    req.file.buffer = Buffer.alloc(0);
  }
}
