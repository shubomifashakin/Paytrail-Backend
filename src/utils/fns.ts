import { ErrorResponse } from "resend";
import { Request } from "express";
import fs from "fs";
import path from "path";
import puppeteer, { PDFOptions } from "puppeteer";

import { Currencies, LogType, Logs, Months } from "@prisma/client";

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
    amount: Logs["amount"];
    currency: Currencies;
    budgetMonth: Months;
  };
  logs: Record<
    string,
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

//FIXME: FIX THIS PDF
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
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              margin: 20px;
             }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #fff;
            -webkit-print-color-adjust: exact; 
            }
            
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .logo-section {
              display: flex;
              align-items: center;
            }
            
            .logo {
              width: 50px;
              height: 50px;
              background: #000 !important;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 20px;
              margin-right: 15px;
            }
            
            .brand-info a {
              font-size: 28px;
              font-weight: 700;
              color: #000;
              text-decoration: none;
              margin-bottom: 5px;
            }
            
            .brand-info p {
              color: #000;
              font-size: 14px;
            }
            
            .user-info {
              text-align: right;
            }
            
            .user-info h2 {
              font-size: 18px;
              color: #000;
              margin-bottom: 5px;
              text-transform:uppercase;
            }
            
            .user-info p {
              color: #000;
              font-size: 14px;
              text-transform:uppercase;
            }
            
            .statement-info {
              background: linear-gradient(135deg, #f3f4f6, #e5e7eb) !important;
              padding: 25px;
              margin-bottom: 30px;
              border-left: 5px solid #000;
            }
            
            .statement-info h3 {
              font-size: 20px;
              color: #000;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            
            .info-item {
              background: white;
              padding: 15px;
              border: 1px solid #e5e7eb;
            }
            
            .info-item label {
              font-weight: 600;
              color: #000;
              display: block;
              margin-bottom: 5px;
              font-size: 14px;
            }
            
            .info-item span {
              color: #6b7280;
              font-size: 14px;
            }
            
            .summary-cards {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            
            .summary-card {
              background: white;
              padding: 20px;
              text-align: center;
              border: 1px solid #e5e7eb;
            }
            
            .summary-card.expenses {
              border-left: 5px solid #dc2626;
            }
            
            .summary-card.incomes {
              border-left: 5px solid #16a34a;
            }
            
            .summary-card.net {
              border-left: 5px solid #2563eb;
            }
            
            .summary-card h4 {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
              text-transform: uppercase;
              font-weight: 600;
            }
            
            .summary-card .amount {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            
            .summary-card.expenses .amount {
              color: #dc2626;
            }
            
            .summary-card.incomes .amount {
              color: #16a34a;
            }
            
            .summary-card.net .amount {
              color: #2563eb;
            }
            
            .budget-section {
              margin-bottom: 40px;
              break-inside: avoid;
            }
            
            .budget-header {
              background: #000000 !important;
              color: white;
              padding: 20px;
              margin-bottom: 0;
            }
            
            .budget-header h3 {
              font-size: 20px;
              margin-bottom: 10px;
              display: flex;
              text-transform:uppercase;
              align-items: center;
              justify-content: space-between;
            }
            
            .budget-details {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 25px;
              margin-top: 15px;
            }
            
            .budget-detail {
              background: rgba(255, 255, 255, 0.1);
              padding: 10px;
              border-radius: 8px;
              backdrop-filter: blur(10px);
            }
            
            .budget-detail label {
              font-size: 12px;
              opacity: 0.8;
              display: block;
              margin-bottom: 5px;
            }
            
            .budget-detail span {
              font-size: 16px;
              font-weight: 600;
            }
            
            .transactions-table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              overflow: hidden;
              text-align: center; /* Center align all table content */
            }
            
            .transactions-table thead {
              background: #f9fafb;
            }
            
            .transactions-table th {
              padding: 15px 12px;
              text-align: center; /* Explicitly center header text */
              font-weight: 600;
              color: #374151;
              font-size: 14px;
              border-bottom: 1px solid #e5e7eb;
            }
    
            
           .transactions-table td {
              padding: 12px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 14px;
              text-align: center; /* Center cell content */
              vertical-align: middle; /* Vertically center content */
            }
            
            .transactions-table tbody tr:hover {
              background: #f9fafb;
            }
            
            .amount-cell {
              text-align: right !important;
              padding-right: 20px !important;
            }
            
            .amount-cell.expense {
              color: #dc2626;
            }
            
            .amount-cell.income {
              color: #16a34a;
            }
            
            .category-tag {
              background: #ede9fe;
              color: #7c3aed;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 12px;
              font-weight: 500;
              text-transform:capitalize;
            }
              
            
            .no-transactions {
              text-align: center;
              color: #6b7280;
              font-size:12px;
              padding: 40px;
              background: #f9fafb;
            }
            
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            
            @media print {
              .budget-section {
                page-break-inside: avoid;
              }
              
              .summary-cards {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo-section">
               <!-- FIXME: ADD LOGO -->
                <img src="${""}" alt="PayTrail Logo" class="logo">
                   
                <div class="brand-info">
             <!-- FIXME: CHANGE TO ACTUAL WEBSITE -->
                  <a href="#" target="_blank">PayTrail</a>
                </div>
              </div>
    
              <div class="user-info">
                <h2>${userName}</h2>
              </div>
            </div>
            
            <!-- Statement Information -->
            <div class="statement-info">
              <h3>Statement Summary</h3>
    
              <div class="info-grid">
                <div class="info-item">
                  <label>Statement Period</label>
    
                  <span>${startDate.month} ${startDate.year} - ${
                    endDate.month
                  } ${endDate.year}</span>
                </div>
    
    
                <div class="info-item">
                  <label>Total Budgets</label>
    
                  <span>${budgetsAndLogs.length}</span>
                </div>
              </div>
            </div>
            
       
            
           <!-- Budget Sections -->
          ${budgetsAndLogs
            .map(
              ({ budget, logs }) => `
            <div class="budget-section">
              <div class="budget-header">
                <h3>
                  <span>${budget.budgetMonth} ${budget.year}</span>
                  <span>${budget.currency} ${budget.amount.toLocaleString()}</span>
                </h3>
              </div>
              
              ${Object.entries(logs)
                .map(
                  ([currency, currencyData]) => `
                  <div class="currency-section">
                    <div class="currency-header">
                      <h4>${currency} Summary</h4>
                      <div class="currency-totals">
                        <div class="total-item">
                          <label>Total Income:</label>
                          <span class="income">${currency} ${currencyData.totals.income.toLocaleString()}</span>
                        </div>
                        <div class="total-item">
                          <label>Total Expense:</label>
                          <span class="expense">${currency} ${currencyData.totals.expense.toLocaleString()}</span>
                        </div>
                        <div class="total-item">
                          <label>Net:</label>
                          <span class="${
                            currencyData.totals.income - currencyData.totals.expense >= 0
                              ? "positive"
                              : "negative"
                          }">
                            ${currency} ${(
                              currencyData.totals.income - currencyData.totals.expense
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    ${
                      currencyData.logs.length > 0
                        ? `
                      <table class="transactions-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Payment Method</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${currencyData.logs
                            .map(
                              (log) => `
                            <tr>
                              <td>${new Date(log.transactionDate).toLocaleDateString()}</td>
                              <td><span class="category-tag">${log.category.name}</span></td>
                              <td>${log.note || "N/A"}</td>
                              <td>${log.paymentMethod.name}</td>
                              <td class="amount-cell ${
                                log.logType === "expense" ? "expense" : "income"
                              }">
                                ${log.logType === "expense" ? "-" : ""}${
                                  log.currency
                                } ${String(log.amount).toLocaleString()}
                              </td>
                            </tr>
                          `,
                            )
                            .join("")}
                        </tbody>
                      </table>
                    `
                        : `
                      <div class="no-transactions">
                        <p>No ${currency} Transactions For This Budget Period</p>
                      </div>
                    `
                    }
                  </div>
                `,
                )
                .join("")}
            </div>
          `,
            )
            .join("")}
            <!-- Footer -->
            <div class="footer">
              <p>This statement was generated automatically by PayTrail on ${new Date().toLocaleDateString(
                "en-GB",
              )}.</p>
              <p>For any questions or concerns, please contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `;

  const pdf = await generatePdf(html, {
    width: 595,
    height: 841,
    timeout: 5000,
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            font-weight: 600;
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
        
     
        
        .log-type-expense {
            background: #f8d7da;
            color: #721c24;
        }
        
        .summary-row {
            background: #f8f9fa;
            font-weight: 500;
        }
        
        .summary-row td {
            padding: 12px 8px;
        }
        
        .amount-positive {
            color: #28a745;
        }
        
        .amount-negative {
            color: #dc3545;
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
