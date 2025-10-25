import { ErrorResponse } from "resend";
import { Request } from "express";
import fs from "fs";
import path from "path";
import puppeteer, { PDFOptions } from "puppeteer";

import { Budgets, Currencies, LogType, Logs, Months } from "@prisma/client";

import logger from "../lib/logger";

import { MESSAGES, currencyData } from "./constants";

/**
 * Sleeps for a specified number of seconds.
 * @param seconds - The number of seconds to sleep (default is 1).
 * @returns A Promise that resolves after the specified number of seconds.
 */
export async function sleep(seconds: number = 1) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export type FetchResult<T> =
  | {
      data: T;
      success: true;
      error: undefined;
      status: number;
    }
  | {
      data: undefined;
      success: false;
      error: Error;
      status: number;
    };

export function logEmailError(
  type: string,
  user: { id: string; email: string },
  error: ErrorResponse,
  req: Request | undefined,
) {
  logger.error(MESSAGES.EMAIL_ERROR, {
    type,
    url: req?.url,
    method: req?.method,
    name: error.name,
    userId: user.id,
    email: user.email,
    message: error.message,
  });
}

export function getMonthIndex(month: Months) {
  return Object.values(Months).findIndex((c) => c === month);
}

export function makeBudgetPeriod(month: Months, year: number) {
  const monthIndex = getMonthIndex(month).toString().padStart(2, "0");
  const period = Number(`${year}${monthIndex}`);
  return period;
}

type StatementData = {
  budget: {
    id: string;
    year: number;
    amount: Budgets["amount"];
    currency: Currencies;
    budgetMonth: Months;
  };
  logs: Record<
    Currencies,
    {
      logs: {
        note: string | null;
        amount: Logs["amount"];
        category: {
          name: string;
        };
        logType: LogType;
        currency: Currencies;
        budgetId: string | null;
        paymentMethod: {
          name: string;
        };
        transactionDate: Date;
      }[];
      totals: {
        expense: number;
        income: number;
      };
    }
  >;
};

export async function generatePdf(html: string, pdfOptions?: PDFOptions) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.bringToFront();
  await page.setContent(html);
  const pdf = await page.pdf(pdfOptions);

  await browser.close();

  return pdf;
}

export async function generateBudgetStatement({
  userName,
  endDate,
  startDate,
  budgetsAndLogs,
}: {
  userName: string;
  budgetsAndLogs: StatementData[];
  endDate: { month: Months; year: number };
  startDate: { month: Months; year: number };
}) {
  const logoImage = path.join(__dirname, "../../public/assets/images/logos/logo.png");
  const imageBuffer = await fs.promises.readFile(logoImage);

  const base64Logo = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  const generatedAt = new Date().toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });

  const budgetSections = budgetsAndLogs
    .map((budgetData) => {
      const { budget, logs } = budgetData;
      const budgetSymbol =
        currencyData[budget.currency as keyof typeof currencyData]?.symbol || budget.currency;
      const budgetAmount = parseFloat(budget.amount.toString());

      const currencySection = Object.entries(logs)
        .map(([currency, currencyLogs]) => {
          const categoryTotal = currencyLogs.totals.income - currencyLogs.totals.expense;
          const isIncome = categoryTotal > 0;

          const currencySymbol =
            currencyData[currency as keyof typeof currencyData]?.symbol || currency;

          const rows = currencyLogs.logs
            .map((log) => {
              const amount = parseFloat(log.amount.toString()).toFixed(2);
              const isLogIncome = log.logType === "income";

              return `
                <tr>
                  <td class="col-date">${formatDate(log.transactionDate)}</td>
                  <td class="col-payment">${log.paymentMethod.name}</td>
                  <td class="col-category">${log.category.name}</td>
                  <td class="col-note">${log.note || "N/A"}</td>
                  <td class="col-amount">
                    ${isLogIncome ? "+" : "-"}${currencySymbol}${amount}
                  </td>
                </tr>
              `;
            })
            .join("");

          return `
            <div class="currency-section">
              <div class="currency-header">
                <span class="currency">${currencySymbol}</span>
                <span class="currency-total">
                  ${isIncome ? "+" : "-"}${currencySymbol}${Math.abs(categoryTotal).toFixed(2)}
                </span>
              </div>

              <table>
                <thead>
                  <tr>
                    <th class="col-date">Date</th>
                    <th class="col-payment">Payment Method</th>
                    <th class="col-category">Category</th>
                    <th class="col-note">Note</th>
                    <th class="col-amount">Amount</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        })
        .join("");

      return `
        <div class="budget-section">
          <div class="budget-header">
            <div class="budget-title-row">
              <div class="budget-name">${budget.budgetMonth} ${budget.year}</div>
            </div>

            <div class="budget-stats">
              <div class="budget-stat">
                <span class="budget-stat-label">Budget</span>
                <span class="budget-stat-value">${budgetSymbol}${budgetAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          ${currencySection || '<div class="no-logs">No transactions for this budget period</div>'}
        </div>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paytrail - Budget Statement</title>
    
    <!-- Geist Font -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
            max-width: 595px;
            margin: 0 auto;
            background: #fff;
        }
        
        .header {
            margin-bottom: 25px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .logo-placeholder {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        
        .logo-placeholder img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .title {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
        }
        
        .subtitle {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }
        
        .meta-info {
            padding: 12px;
            margin-bottom: 20px;
        }
        
        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        
        .meta-row:last-child {
            margin-bottom: 0;
        }
        
        .meta-label {
            color: #666;
            font-weight: 500;
        }
        
        .meta-value {
            color: #1a1a1a;
            font-weight: 500;
        }
        
        .budget-section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        
        .budget-header {
            background: rgba(9, 24, 39, 1);
            color: white;
            padding: 12px 14px;
            margin-bottom: 0;
        }
        
        .budget-title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .budget-name {
            font-size: 16px;
            font-weight: 700;
        }
        
        .budget-period {
            font-size: 11px;
            opacity: 0.95;
        }
        
        .budget-stats {
            display: flex;
            gap: 20px;
            font-size: 12px;
        }
        
        .budget-stat {
            display: flex;
            flex-direction: column;
        }
        
        .budget-stat-label {
            font-size: 9px;
            opacity: 0.85;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .budget-stat-value {
            font-size: 14px;
            font-weight: 600;
            margin-top: 2px;
        }
      
        
        .currency-section {
            background: #fafbfc;
            border-top: none;
            padding: 0;
        }
        
        .currency-header {
            background: #f8f9fa;
            border-bottom: solid 1px rgba(93, 93, 93, 0.15);
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .currency {
            font-weight: 600;
            font-size: 12px;
            color: #1a1a1a;
        }
        
        .currency-total {
            font-weight: 600;
            font-size: 12px;
        }
        
        table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-bottom: 10px;
            background: white;
            border: 1px solid "rgba(93, 93, 93, 0.15)";
            border-top: none;
        }

        thead {
            background: #f8f9fa;
        }
        
        th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 500;
            color: #555;
            width: 100%;
            border-bottom: 2px solid "rgba(93, 93, 93, 0.15)";
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        td {
            padding: 10px 8px;
            font-size: 10px;
            border-bottom: 1px solid #f0f0f0;
            color: #333;
        }
 
        tbody tr:hover {
            background: #f9fafb;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid "rgba(93, 93, 93, 0.15)";
            text-align: center;
            color: #999;
            font-size: 9px;
        }
        
        .no-logs {
            padding: 20px;
            text-align: center;
            color: #999;
            font-style: italic;
        }
        
        @media print {
            body {
                padding: 0;
            }
            .budget-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>

<body>
    <div class="header">
        <div class="logo-section">
            <div class="logo-placeholder">
                <img src="${base64Logo}" alt="Paytrail Logo" />
            </div>
            <div>
                <div class="title">Paytrail Budget Statement</div>
                <div class="subtitle">Generated on ${generatedAt}</div>
            </div>
        </div>
    </div>
    
    <div class="meta-info">
        <div class="meta-row">
            <span class="meta-label">Account Holder:</span>
            <span class="meta-value">${userName}</span>
        </div>

        <div class="meta-row">
            <span class="meta-label">Report Period:</span>
            <span class="meta-value">${startDate.month} ${startDate.year} to ${endDate.month} ${endDate.year}</span>
        </div>

        <div class="meta-row">
            <span class="meta-label">Total Budgets:</span>
            <span class="meta-value">${budgetsAndLogs.length}</span>
        </div>
    </div>
    
    ${budgetSections}
    
    <div class="footer">
        Paytrail Financial Statement • Generated via Paytrail App
    </div>
</body>
</html>`;

  const pdf = await generatePdf(html, {
    width: 595,
    height: 841,
    timeout: 5000,
    printBackground: true,
    waitForFonts: true,
    margin: { top: 20, bottom: 20, left: 20, right: 20 },
  });

  return pdf;
}

export async function generateLogsStatement({
  userName,
  startDate,
  endDate,
  logs,
}: {
  userName: string;
  startDate: string;
  endDate: string;
  logs: (Omit<
    Logs,
    "id" | "budgetId" | "userId" | "paymentMethodId" | "categoryId" | "updatedAt" | "createdAt"
  > & {
    category: { name: string };
    paymentMethod: { name: string };
  })[];
}) {
  const logsByCurrency = logs.reduce(
    (acc, log) => {
      if (!acc[log.currency]) acc[log.currency] = [];
      acc[log.currency].push(log);
      return acc;
    },
    {} as Record<Currencies, typeof logs>,
  );

  const currencies = Object.keys(logsByCurrency).join(", ");

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour12: true,
    });

  const generatedAt = new Date().toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const logoImage = path.join(__dirname, "../../public/assets/images/logos/logo.png");
  const imageBuffer = await fs.promises.readFile(logoImage);

  const base64Logo = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  const currencySections = Object.entries(logsByCurrency)
    .map(([currency, currencyLogs]) => {
      const total = currencyLogs.reduce(
        (sum, log) =>
          sum +
          (log.logType === "expense"
            ? -parseFloat(log.amount.toString())
            : parseFloat(log.amount.toString())),
        0,
      );

      const grandTotal =
        total < 0
          ? "-" +
            (currencyData[currency as Currencies]?.symbol || currency) +
            Math.abs(total).toFixed(2)
          : (currencyData[currency as Currencies]?.symbol || currency) + total.toFixed(2);

      const rows = currencyLogs
        .map((log) => {
          const transactionDate = new Date(log.transactionDate).toISOString().split("T")[0];
          const transactionNote = log.note || "N/A";
          const transactionCategory = log.category.name;
          const transactionPaymentMethod = log.paymentMethod.name;
          const transactionAmount = `${log.logType === "expense" ? "-" : ""}${currencyData[currency as Currencies]?.symbol || currency}${parseFloat(log.amount.toString()).toFixed(2)}`;

          return `
              <tr>
              <td class="col-date">${transactionDate}</td>
              <td class="col-note">${transactionNote}</td>
              <td class="col-vendor">${transactionCategory}</td>
              <td class="col-payment">${transactionPaymentMethod}</td>
              <td class="col-amount">${transactionAmount}</td>
              </tr>
            `;
        })
        .join("");

      return `
      <div class="currency-section">
        <div class="currency-header">
          <div>
            <div>${currency} Report</div>
            <div class="transaction-count">${currencyLogs.length} Transaction${currencyLogs.length > 1 ? "s" : ""}</div>
          </div>
          <div class="grand-total">${grandTotal}</div>
        </div>

        <table>
          <thead>
            <tr>
            <th class="col-date">Date</th>
              <th class="col-note">Note</th>
              <th class="col-vendor">Category</th>
              <th class="col-payment">Payment Method</th>
              <th class="col-amount">Total</th>
            </tr>
          </thead>

          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
    
    <title>Paytrail - Statement Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            padding: 20px;
            max-width: 595px;
            margin: 0 auto;
            background: #fff;
        }
        
        .header {
            margin-bottom: 25px;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .logo-container {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }

        .logo {
            width: 100%;
            height: 100%;
        }
        
        .title {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
        }
        
        .subtitle {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }
        
        .meta-info {
            padding: 12px;
            margin-bottom: 20px;
        }
        
        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
        }
        
        .meta-row:last-child {
            margin-bottom: 0;
        }
        
        .meta-label {
            color: #666;
            font-weight: 500;
        }
        
        .meta-value {
            color: #1a1a1a;
            font-weight: 500;
        }
        
        .currency-section {
            margin-bottom: 30px;
            width: 100%;
            page-break-inside: avoid;
        }
        
        .currency-header {
            background: rgba(9, 24, 39, 1);
            color: white;
            padding: 10px 12px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .grand-total {
            font-size: 18px;
            font-weight: 600;
        }
        
        .transaction-count {
            font-size: 11px;
            opacity: 0.9;
        }
        
        table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            margin-bottom: 10px;
            background: white;
            border: 1px solid "rgba(93, 93, 93, 0.15)";
            border-top: none;
        }
        
        thead {
            background: #f8f9fa;
        }
        
        th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 500;
            color: #555;
            width: 100%;
            border-bottom: 2px solid "rgba(93, 93, 93, 0.15)";
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        td {
            padding: 10px 8px;
            font-size: 10px;
            border-bottom: 1px solid #f0f0f0;
            color: #333;
        }

       
        tbody tr:hover {
            background: #f9fafb;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid "rgba(93, 93, 93, 0.15)";
            text-align: center;
            color: #999;
            font-size: 9px;
        }
        
        @media print {
            body {
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <div class="logo-container">
              <img src="${base64Logo}" alt="Logo" class="logo" />
            </div>
            <div>
                <div class="title">Paytrail Statement</div>
                <div class="subtitle">Generated on ${generatedAt}</div>
            </div>
        </div>
    </div>
    
    <div class="meta-info">
        <div class="meta-row">
            <span class="meta-label">Account Holder:</span>
            <span class="meta-value">${userName}</span>
        </div>
        <div class="meta-row">
            <span class="meta-label">Report Duration:</span>
            <span class="meta-value">${formatDate(startDate)} to ${formatDate(endDate)}</span>
        </div>
        <div class="meta-row">
            <span class="meta-label">Currencies:</span>
            <span class="meta-value">${currencies}</span>
        </div>
    </div>
    
    ${currencySections}
    
    <div class="footer">
        Paytrail Financial Statement • Generated via Paytrail App
    </div>
</body>
</html>`;

  const pdf = await generatePdf(html, {
    width: 595,
    height: 841,
    timeout: 5000,
    printBackground: true,
    waitForFonts: true,
    margin: { top: 20, bottom: 20, left: 20, right: 20 },
  });

  return pdf;
}
