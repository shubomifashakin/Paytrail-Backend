/*
  Warnings:

  - A unique constraint covering the columns `[deviceToken]` on the table `device_token` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "device_token_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "device_token_deviceToken_key" ON "device_token"("deviceToken");
