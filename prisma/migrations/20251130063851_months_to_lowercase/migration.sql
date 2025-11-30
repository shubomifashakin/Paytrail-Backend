/*
  Warnings:

  - The values [January,February,March,April,May,June,July,August,September,October,November,December] on the enum `Months` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Months_new" AS ENUM ('january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december');
ALTER TABLE "budgets" ALTER COLUMN "budgetMonth" TYPE "Months_new" USING (LOWER("budgetMonth"::text)::"Months_new");
ALTER TYPE "Months" RENAME TO "Months_old";
ALTER TYPE "Months_new" RENAME TO "Months";
DROP TYPE "public"."Months_old";
COMMIT;
