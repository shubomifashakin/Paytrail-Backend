/*
  Warnings:

  - Made the column `budgetId` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_budgetId_fkey";

-- AlterTable
ALTER TABLE "public"."transactions" ALTER COLUMN "budgetId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "public"."budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
