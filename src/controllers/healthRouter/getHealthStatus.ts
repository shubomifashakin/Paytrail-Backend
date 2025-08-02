import { Request, Response } from "express";

export async function getHealthStatus(_: Request, res: Response) {
  return res.status(200).json({
    message: "Healthy",
    time: new Date().toDateString(),
  });
}
