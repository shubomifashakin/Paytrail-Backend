-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_budgetId_fkey";

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "public"."budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
