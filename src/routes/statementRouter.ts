import { Router } from "express";

import { getStatement } from "../controllers/statementRouter/getStatement";

const statementRouter = Router();

statementRouter.get("/", getStatement);

export default statementRouter;
