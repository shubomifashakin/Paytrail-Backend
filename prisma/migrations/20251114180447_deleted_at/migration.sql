-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "user_email_deletedAt_idx" ON "user"("email", "deletedAt");

-- CreateIndex
CREATE INDEX "user_id_deletedAt_idx" ON "user"("id", "deletedAt");
