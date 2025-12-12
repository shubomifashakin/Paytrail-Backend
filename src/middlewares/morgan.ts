import { Request } from "express";
import morgan from "morgan";

import logger from "../lib/logger";

import { normalizeRequestPath } from "../utils/fns";

export default function morganToJson() {
  return morgan(
    function (tokens, req, res) {
      return JSON.stringify({
        "remote-address": tokens["remote-addr"](req, res),
        method: tokens.method(req, res),
        path: normalizeRequestPath(req),
        "status-code": tokens.status(req, res),
        "content-length": tokens.res(req, res, "content-length"),
        "response-time": `${tokens["response-time"](req, res)} ms`,
        "user-agent": tokens["user-agent"](req, res),
        "request-id": tokens.requestId(req, res),
      });
    },
    {
      stream: {
        write: (message) => {
          const parsed = JSON.parse(message);
          logger.info("HTTP Request", parsed);
        },
      },
      skip: (req: Request) => {
        const path = req.originalUrl || req.url || "";
        return /^\/(health|metrics)(\/|$)/i.test(path);
      },
    },
  );
}
