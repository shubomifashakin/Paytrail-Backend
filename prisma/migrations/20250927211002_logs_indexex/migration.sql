-- CreateIndex
CREATE INDEX "logs_budgetId_categoryId_currency_idx" ON "public"."logs"("budgetId", "categoryId", "currency");

-- CreateIndex
CREATE INDEX "logs_userId_transactionDate_currency_idx" ON "public"."logs"("userId", "transactionDate", "currency");
