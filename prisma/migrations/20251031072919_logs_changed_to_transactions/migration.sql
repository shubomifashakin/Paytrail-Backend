/*
  Warnings:

  - You are about to drop the `logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_userId_fkey";

-- DropTable
DROP TABLE "public"."logs";

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "note" VARCHAR(50),
    "logType" "public"."LogType" NOT NULL,
    "currency" "public"."Currencies" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "budgetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_budgetId_categoryId_currency_idx" ON "public"."transactions"("budgetId", "categoryId", "currency");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_currency_idx" ON "public"."transactions"("userId", "transactionDate", "currency");

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "public"."budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
