/*
  Warnings:

  - You are about to drop the column `os` on the `device_token` table. All the data in the column will be lost.
  - Added the required column `platform` to the `device_token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."device_token" DROP COLUMN "os",
ADD COLUMN     "platform" "public"."Platforms" NOT NULL;
