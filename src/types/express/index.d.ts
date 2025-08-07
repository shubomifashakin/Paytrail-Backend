import "express";
import { User } from "@prisma/client";

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
    user: User;
  }
}
