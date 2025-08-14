/*
  Warnings:

  - You are about to drop the column `logType` on the `categories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,color]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,name]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,emoji]` on the table `categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "categories_userId_color_logType_key";

-- DropIndex
DROP INDEX "categories_userId_emoji_logType_key";

-- DropIndex
DROP INDEX "categories_userId_name_logType_key";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "logType";

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_color_key" ON "categories"("userId", "color");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_key" ON "categories"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_emoji_key" ON "categories"("userId", "emoji");
