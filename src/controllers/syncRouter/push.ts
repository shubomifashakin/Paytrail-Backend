import { Request, Response } from "express";

export default async function (_req: Request, res: Response) {
  return res.status(200).json({ serverTime: new Date().toISOString() });
}
