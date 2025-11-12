import { RedisClientType } from "redis";
import { Request, Response } from "express";

import logger from "../../lib/logger";

import serverEnv from "../../serverEnv";

import { MESSAGES } from "../../utils/constants";
import { validateCurrency } from "../../utils/validators";

export default function getRates({ redisClient }: { redisClient: RedisClientType }) {
  return async (req: Request, res: Response) => {
    const currency = req.query?.currency as string;

    const { success, error, data } = validateCurrency.safeParse(currency);

    if (!success) {
      logger.warn(error.message);

      return res.status(400).json({ message: MESSAGES.BAD_REQUEST });
    }

    const cachedRate = await redisClient.get(`rate:${currency}`).catch((err) => {
      logger.error("Failed to get rate from cache", err);

      return undefined;
    });

    if (cachedRate) {
      logger.debug("Cache hit");
      return res.status(200).json(JSON.parse(cachedRate));
    }

    logger.debug("Cache miss");

    const rateReq = await fetch(
      `https://v6.exchangerate-api.com/v6/${serverEnv.exchangeRateApiKey}/latest/${data}`,
      {
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!rateReq.ok) {
      const rateData = (await rateReq.json()) as CurrencyConverterResponse;
      logger.error("Failed to fetch rates from api", rateData.error_type);

      return res.status(500).json({ message: MESSAGES.INTERNAL_SERVER_ERROR });
    }

    const rateData = (await rateReq.json()) as CurrencyConverterResponse;

    await redisClient
      .set(`rate:${currency}`, JSON.stringify(rateData.conversion_rates), {
        EX: 60 * 60 * 24 * 7,
      })
      .catch((err) => {
        logger.error("Failed to set rate in cache", err);
      });

    return res.status(200).json(rateData.conversion_rates);
  };
}

type CurrencyConverterResponse = {
  result: "success" | "error";
  error_type?: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
};
