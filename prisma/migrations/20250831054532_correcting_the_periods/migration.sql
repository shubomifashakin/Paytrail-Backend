-- This is an empty migration.

UPDATE "public"."budgets"
SET "period" = "year" * 100 + CASE "budgetMonth"
  WHEN 'January' THEN 0
  WHEN 'February' THEN 1
  WHEN 'March' THEN 2
  WHEN 'April' THEN 3
  WHEN 'May' THEN 4
  WHEN 'June' THEN 5
  WHEN 'July' THEN 6
  WHEN 'August' THEN 7
  WHEN 'September' THEN 8
  WHEN 'October' THEN 9
  WHEN 'November' THEN 10
  WHEN 'December' THEN 11
END;

UPDATE "public"."budgets" SET "updatedAt" = CURRENT_TIMESTAMP;