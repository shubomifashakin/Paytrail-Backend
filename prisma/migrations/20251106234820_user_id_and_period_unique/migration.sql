/*
  Warnings:

  - A unique constraint covering the columns `[userId,period]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."budgets_userId_period_idx";

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_period_key" ON "public"."budgets"("userId", "period");
