-- CreateEnum
CREATE TYPE "Months" AS ENUM ('january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('expense', 'income');

-- CreateEnum
CREATE TYPE "Currencies" AS ENUM ('USD', 'NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'ZAR', 'GHS', 'KES', 'EGP', 'SAR', 'AED', 'TRY', 'RUB', 'CHF', 'SEK', 'NOK', 'DKK', 'SGD', 'NZD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'KRW', 'THB', 'IDR', 'PHP', 'MYR', 'VND', 'PKR', 'BDT', 'QAR', 'KWD', 'OMR', 'BHD', 'JOD', 'LBP', 'IRR', 'BOB', 'UYU', 'PLN', 'CZK', 'HUF', 'ILS', 'TZS', 'UGX', 'DZD', 'MAD', 'TND', 'HKD', 'TWD', 'RON', 'BGN', 'HRK', 'RSD', 'UAH', 'BYN', 'KZT', 'UZS', 'KGS', 'TJS', 'AFN', 'NPR', 'LKR', 'MMK', 'KHR', 'LAK', 'MNT', 'MVR', 'SCR', 'MUR', 'LSL', 'NAD', 'BWP', 'ZMW', 'MWK', 'AOA', 'CDF', 'XAF', 'XOF', 'XPF', 'XCD', 'BBD', 'JMD', 'TTD', 'BZD', 'GTQ', 'HNL', 'NIO', 'CRC', 'GYD', 'SRD', 'FJD', 'PGK', 'WST', 'TOP', 'SBD', 'TVD', 'HTG', 'DOP', 'CUP', 'BMD', 'KYD', 'BIF', 'DJF', 'KMF', 'RWF', 'GMD', 'GNF', 'ERN', 'ETB', 'SOS', 'YER', 'IQD', 'SYP', 'LYD', 'SDG', 'SSP', 'CVE', 'BND');

-- CreateEnum
CREATE TYPE "Platforms" AS ENUM ('android', 'ios');

-- CreateTable
CREATE TABLE "device_token" (
    "id" TEXT NOT NULL,
    "platform" "Platforms" NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "snsEndpointArn" TEXT NOT NULL,
    "subscriptionArn" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "device_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "currency" "Currencies" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "year" INTEGER NOT NULL,
    "budgetMonth" "Months" NOT NULL,
    "currency" "Currencies" NOT NULL,
    "userId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "color" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" VARCHAR(50) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "color" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" VARCHAR(50) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "note" VARCHAR(50),
    "transactionType" "TransactionType" NOT NULL,
    "currency" "Currencies" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_token_deviceToken_key" ON "device_token"("deviceToken");

-- CreateIndex
CREATE INDEX "device_token_userId_snsEndpointArn_idx" ON "device_token"("userId", "snsEndpointArn");

-- CreateIndex
CREATE INDEX "device_token_deviceToken_idx" ON "device_token"("deviceToken");

-- CreateIndex
CREATE INDEX "user_email_deletedAt_idx" ON "user"("email", "deletedAt");

-- CreateIndex
CREATE INDEX "user_id_deletedAt_idx" ON "user"("id", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_period_key" ON "budgets"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_budgetMonth_year_key" ON "budgets"("userId", "budgetMonth", "year");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_color_key" ON "categories"("userId", "color");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_key" ON "categories"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_emoji_key" ON "categories"("userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_userId_name_key" ON "payment_methods"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_userId_color_key" ON "payment_methods"("userId", "color");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_userId_emoji_key" ON "payment_methods"("userId", "emoji");

-- CreateIndex
CREATE INDEX "transactions_budgetId_categoryId_currency_idx" ON "transactions"("budgetId", "categoryId", "currency");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_currency_idx" ON "transactions"("userId", "transactionDate", "currency");

-- AddForeignKey
ALTER TABLE "device_token" ADD CONSTRAINT "device_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
