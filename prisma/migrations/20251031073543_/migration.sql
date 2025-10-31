/*
  Warnings:

  - You are about to drop the column `TransactionType` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `transactionType` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."transactions" DROP COLUMN "TransactionType",
ADD COLUMN     "transactionType" "public"."TransactionType" NOT NULL;
