/*
  Warnings:

  - You are about to drop the column `logType` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `TransactionType` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('expense', 'income');

-- AlterTable
ALTER TABLE "public"."transactions" DROP COLUMN "logType",
ADD COLUMN     "TransactionType" "public"."TransactionType" NOT NULL;

-- DropEnum
DROP TYPE "public"."LogType";
