/*
  Warnings:

  - The values [SLL,STD] on the enum `Currencies` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Currencies_new" AS ENUM ('USD', 'NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'ZAR', 'GHS', 'KES', 'EGP', 'SAR', 'AED', 'TRY', 'RUB', 'CHF', 'SEK', 'NOK', 'DKK', 'SGD', 'NZD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'KRW', 'THB', 'IDR', 'PHP', 'MYR', 'VND', 'PKR', 'BDT', 'QAR', 'KWD', 'OMR', 'BHD', 'JOD', 'LBP', 'IRR', 'BOB', 'UYU', 'PLN', 'CZK', 'HUF', 'ILS', 'TZS', 'UGX', 'DZD', 'MAD', 'TND', 'HKD', 'TWD', 'RON', 'BGN', 'HRK', 'RSD', 'UAH', 'BYN', 'KZT', 'UZS', 'KGS', 'TJS', 'AFN', 'NPR', 'LKR', 'MMK', 'KHR', 'LAK', 'MNT', 'MVR', 'SCR', 'MUR', 'LSL', 'NAD', 'BWP', 'ZMW', 'MWK', 'AOA', 'CDF', 'XAF', 'XOF', 'XPF', 'XCD', 'BBD', 'JMD', 'TTD', 'BZD', 'GTQ', 'HNL', 'NIO', 'CRC', 'GYD', 'SRD', 'FJD', 'PGK', 'WST', 'TOP', 'SBD', 'TVD', 'HTG', 'DOP', 'CUP', 'BMD', 'KYD', 'BIF', 'DJF', 'KMF', 'RWF', 'GMD', 'GNF', 'ERN', 'ETB', 'SOS', 'YER', 'IQD', 'SYP', 'LYD', 'SDG', 'SSP', 'CVE', 'BND');
ALTER TABLE "public"."user" ALTER COLUMN "currency" TYPE "public"."Currencies_new" USING ("currency"::text::"public"."Currencies_new");
ALTER TABLE "public"."budgets" ALTER COLUMN "currency" TYPE "public"."Currencies_new" USING ("currency"::text::"public"."Currencies_new");
ALTER TABLE "public"."transactions" ALTER COLUMN "currency" TYPE "public"."Currencies_new" USING ("currency"::text::"public"."Currencies_new");
ALTER TYPE "public"."Currencies" RENAME TO "Currencies_old";
ALTER TYPE "public"."Currencies_new" RENAME TO "Currencies";
DROP TYPE "public"."Currencies_old";
COMMIT;
