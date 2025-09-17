import z from "zod";
import { Request, Response } from "express";

import { MESSAGES } from "../../utils/constants";
import { clearBuffer } from "../../utils/fns";

export async function uploadReceipt(req: Request, res: Response) {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    //FIXME: ADD AN ERROR LOGGER
    console.error("no files uploaded");

    return res.status(400).json({
      message: MESSAGES.BAD_REQUEST,
    });
  }

  const { success, error, data } = z
    .object({
      privacyMode: z.enum(["true", "false"], { error: "Invalid privacy mode" }),
    })
    .safeParse(req.body);

  if (!success) {
    //FIXME: LOG THE ERROR
    console.error(error);

    return res.status(400).json({
      message: MESSAGES.BAD_REQUEST,
    });
  }

  if (data.privacyMode === "true") {
    //FIXME: PROCESS ON THE SERVER
    ///RETURN THE RESULTS TO THE USER

    //clear the buffer
    clearBuffer(req);

    return res.status(200).json({});
  }

  //FIXME: UPLOAD TO S3

  clearBuffer(req);

  return res.status(200).json({});
}
