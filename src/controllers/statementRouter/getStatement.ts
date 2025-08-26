import { Request, Response } from "express";

import { MESSAGES } from "../../utils/constants";
import { validateQueryDate } from "../../utils/validators";

export async function getStatement(req: Request, res: Response) {
  const { success, error, data } = validateQueryDate.safeParse(req.query);

  if (!success) {
    //FIXME: LOG THE ERROR
    console.error(error);

    return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
  }

  //FIXME: SEND THE PARAMS TO STATEMENT QUEUE INCLUDING THE USERID
  console.log(data);

  return res.status(200).json({ message: "success" });
}
