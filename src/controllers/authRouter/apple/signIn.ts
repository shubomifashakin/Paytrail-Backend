import { Request, Response } from "express";

export default async function signInWithApple(_req: Request, res: Response) {
  return res.status(200).json();
}
