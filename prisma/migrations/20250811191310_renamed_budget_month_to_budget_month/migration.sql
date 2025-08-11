/*
  Warnings:

  - You are about to drop the column `budget_month` on the `Budgets` table. All the data in the column will be lost.
  - Added the required column `budgetMonth` to the `Budgets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Budgets" DROP COLUMN "budget_month",
ADD COLUMN     "budgetMonth" "Months" NOT NULL;
