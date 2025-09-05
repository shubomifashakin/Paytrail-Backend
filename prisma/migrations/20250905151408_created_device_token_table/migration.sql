/*
  Warnings:

  - You are about to drop the column `deviceToken` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."Platforms" AS ENUM ('Android', 'iOS');

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "deviceToken";

-- CreateTable
CREATE TABLE "public"."device_token" (
    "id" TEXT NOT NULL,
    "os" "public"."Platforms" NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "snsEndpointArn" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "device_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_token_userId_idx" ON "public"."device_token"("userId");

-- CreateIndex
CREATE INDEX "device_token_deviceToken_idx" ON "public"."device_token"("deviceToken");

-- AddForeignKey
ALTER TABLE "public"."device_token" ADD CONSTRAINT "device_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
