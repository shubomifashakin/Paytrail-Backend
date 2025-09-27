/*
  Warnings:

  - You are about to alter the column `name` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `emoji` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1)`.
  - You are about to alter the column `description` on the `categories` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `note` on the `logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `name` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(30)`.
  - You are about to alter the column `description` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `emoji` on the `payment_methods` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1)`.

*/
-- AlterTable
ALTER TABLE "public"."categories" ALTER COLUMN "name" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."logs" ALTER COLUMN "note" DROP NOT NULL,
ALTER COLUMN "note" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "public"."payment_methods" ALTER COLUMN "name" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(50);