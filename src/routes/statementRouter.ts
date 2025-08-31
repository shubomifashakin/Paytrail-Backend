import { Router } from "express";

import requestStatement from "../controllers/statementRouter/requestStatement";

const statementRouter = Router();

statementRouter.post("/", requestStatement);

export default statementRouter;
