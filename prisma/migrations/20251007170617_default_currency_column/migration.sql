/*
  Warnings:

  - Added the required column `currency` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable

ALTER TABLE "public"."user" ADD COLUMN "currency" "public"."Currencies";

UPDATE "public"."user" SET "currency" = 'USD';

ALTER TABLE "public"."user" ALTER COLUMN "currency" SET NOT NULL;