/*
  Warnings:

  - The values [Android,iOS] on the enum `Platforms` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Platforms_new" AS ENUM ('android', 'ios');
ALTER TABLE "public"."device_token" ALTER COLUMN "platform" TYPE "public"."Platforms_new" USING ("platform"::text::"public"."Platforms_new");
ALTER TYPE "public"."Platforms" RENAME TO "Platforms_old";
ALTER TYPE "public"."Platforms_new" RENAME TO "Platforms";
DROP TYPE "public"."Platforms_old";
COMMIT;
