import { Router } from "express";

import { getStatement } from "../controllers/statementRouter/getStatement";

const statementRouter = Router();

statementRouter.post("/", getStatement);

export default statementRouter;
