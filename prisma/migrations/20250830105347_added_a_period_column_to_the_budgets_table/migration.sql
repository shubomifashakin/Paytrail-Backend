/*
  Warnings:

  - Added the required column `period` to the `budgets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."budgets" ADD COLUMN     "period" INTEGER;


UPDATE "public"."budgets"
SET "period" = "year" * 100 + CASE "budgetMonth"
  WHEN 'January' THEN 1
  WHEN 'February' THEN 2
  WHEN 'March' THEN 3
  WHEN 'April' THEN 4
  WHEN 'May' THEN 5
  WHEN 'June' THEN 6
  WHEN 'July' THEN 7
  WHEN 'August' THEN 8
  WHEN 'September' THEN 9
  WHEN 'October' THEN 10
  WHEN 'November' THEN 11
  WHEN 'December' THEN 12
END;



ALTER TABLE "public"."budgets"
ALTER COLUMN "period" SET NOT NULL;