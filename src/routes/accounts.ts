import { Router } from "express";

import isAuthorized from "../middlewares/isAuthorized";
import validateRequestDeleteJwt from "../middlewares/validateRequestDeleteJwt";

import { deleteUserAccount } from "../controllers/accountsRouter/deleteAccount";
import handleRequestDelete from "../controllers/accountsRouter/deletionRequests";

export default function createAccountRouter() {
  const router = Router();

  router.delete("/deletion-requests", validateRequestDeleteJwt, handleRequestDelete);

  router.delete("/me", isAuthorized, deleteUserAccount);

  return router;
}
