-- DropIndex
DROP INDEX "public"."device_token_userId_idx";

-- CreateIndex
CREATE INDEX "device_token_userId_snsEndpointArn_idx" ON "public"."device_token"("userId", "snsEndpointArn");
