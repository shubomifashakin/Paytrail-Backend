import { RedisClientType } from "redis";
import { RedisStore } from "rate-limit-redis";
import { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/**
 *
 * @param redisClient - the redis client to use
 * @param limit - the quota  (default 10)
 * @param window - the amount of time in seconds, that the user has to wait after exhausting their quota (default 60 seconds)
 * @param keyGenerator - a function that returns a string which is used as the key (it should return a unique string. The default is the users ip)
 */
const createRateLimiter = ({
  redisClient,
  limit = 10,
  window = 60,
  keyGenerator = (req: Request) => {
    return ipKeyGenerator(req.ip as string);
  },
}: {
  limit?: number;
  window?: number;
  redisClient: RedisClientType;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    limit,
    windowMs: window * 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    keyGenerator,

    store: new RedisStore({
      prefix: "ratelimit:",
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
  });
};

export default createRateLimiter;
