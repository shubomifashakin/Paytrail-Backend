/*
  Warnings:

  - A unique constraint covering the columns `[userId,emoji]` on the table `payment_methods` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `emoji` to the `payment_methods` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."payment_methods" ADD COLUMN "emoji" TEXT;


WITH ranked_methods AS (
  SELECT id, '💳' || ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "id") AS new_emoji
  FROM "public"."payment_methods"
)
UPDATE "public"."payment_methods" pm
SET "emoji" = ranked_methods.new_emoji
FROM ranked_methods
WHERE pm.id = ranked_methods.id;


-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_userId_emoji_key" ON "public"."payment_methods"("userId", "emoji");


-- ADD NOT NULL CONSTRAINT
ALTER TABLE "public"."payment_methods" ALTER COLUMN "emoji" SET NOT NULL;