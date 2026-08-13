# 📊 Ledger - Multi-Currency Expense & Personal Finance Tracker

**Ledger** is a modern, privacy-first, offline-ready expense and personal finance tracker designed for individuals, travelers, students, and freelancers who deal with multiple currencies, borrowed/lent money, and custom budgets.

---

## 🎯 Purpose & Core Value Proposition

Managing finances across different currencies, bank accounts, and payment methods often leads to friction. Most online expense trackers require paid subscriptions, mandatory account creation, or online sync that compromises financial privacy.

**Ledger** solves this by providing:
1. **100% Offline & Private First**: All your data is stored locally in your browser (`localStorage`). No forced logins or third-party servers storing your transaction records.
2. **Multi-Currency Support**: Track expenses natively in USD (`$`), EUR (`€`), GBP (`£`), JPY (`¥`), NPR (`NPR`), INR (`₹`), AUD (`A$`), CAD (`C$`), or any custom currency code you specify.
3. **Monthly Budgeting & Limits**: Set monthly spending limits per currency and monitor real-time progress bars with warning thresholds.
4. **Borrowed Money & Debt Tracker**: Seamlessly keep records of money lent to friends or borrowed from creditors with settlement status tracking.
5. **Rich Interactive Analytics**: Categorized breakdown pie charts, monthly comparison bar graphs, and source distribution summaries.
6. **Data Ownership & Portability**: One-click JSON backup, restore, and CSV export capabilities to keep your data safe and synced across your devices.

---

## ✨ Key Features Overview

### 1. 💱 Multi-Currency Expense Logging
* Track expenses in base currencies or custom ISO codes.
* Filter expenses by date, currency, category, or payment source (Cash, Credit Card, Bank Transfer, Digital Wallet, eSewa, Khalti, etc.).
* Interactive breakdown card per currency showing monthly totals, average spend per transaction, and transaction count.

### 2. 📊 Visual Analytics & Category Breakdown
* **Category Distribution**: Recharts-powered pie charts detailing top spending categories.
* **Monthly Spend Trends**: Visual bar charts comparing total expenditures across recent months.
* **Payment Source Breakdown**: Analysis of cash vs card vs digital wallet spending.

### 3. 🤝 Debt & Borrowed Money Tracker
* Log money you lent to others (Receivable) or money you borrowed (Payable).
* Mark items as **Settled** or **Pending**.
* Net Balance calculation showing if you are owed money or owe money overall.

### 4. 🎯 Monthly Budget Allocations
* Set targeted monthly spending caps for each currency.
* Color-coded progress indicators:
  * 🟢 **Safe** (< 75% limit)
  * 🟡 **Warning** (75% - 90% limit)
  * 🔴 **Critical / Over Budget** (> 90% limit)

### 5. 💾 Backup, Restore & CSV Export
* **JSON Export**: Save full application state (expenses, categories, custom currencies, debt records, budgets).
* **JSON Restore**: Instantly import existing backup files into any browser or device.
* **CSV Export**: Generate raw spreadsheet CSV files for custom analysis in Excel or Google Sheets.

---

## 🛠️ Technology Stack

* **Frontend Framework**: React 18 + Vite (TypeScript)
* **Styling & UI**: Tailwind CSS v4 with a Frosted Glass aesthetic, custom gradients, and backdrop blurs
* **Icons**: `lucide-react`
* **Charts & Visualizations**: `recharts`
* **State Management**: Reactive React state synced with `localStorage`
* **Build System**: Vite & ESBuild

---

## 📁 Repository & File Structure

```
├── src/
│   ├── components/
│   │   ├── AnalyticsCharts.tsx   # Recharts pie & bar charts for expense insights
│   │   ├── BackupModal.tsx       # Backup, Restore (JSON) & CSV export modal
│   │   ├── BudgetManager.tsx     # Monthly budget caps & spending progress
│   │   ├── CurrencyCards.tsx     # Summary cards for each currency total
│   │   ├── DebtTracker.tsx       # Borrowed & lent money manager
│   │   ├── ExpenseList.tsx       # Expense list table with search, filter, and sorting
│   │   ├── ExpenseModal.tsx      # Add & Edit expense modal form
│   │   └── Navbar.tsx            # Sticky header with month navigation and tabs
│   ├── data/
│   │   └── constants.ts          # Default currencies, categories, and sample data generator
│   ├── utils/
│   │   └── storage.ts            # LocalStorage engine, export/import utilities
│   ├── App.tsx                   # Main layout container and tab view switching
│   ├── index.css                 # Tailwind CSS styling directives
│   ├── main.tsx                  # Application entry point
│   └── types.ts                  # TypeScript interfaces for Expense, Debt, Budget, etc.
├── index.html                    # HTML shell & SEO meta tags
├── metadata.json                 # AI Studio application metadata
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🚀 Quick Start (Local Setup)

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd Expense
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🔒 Privacy & Data Policy

Ledger does **not** send your financial transactions, notes, or balances to any external server. All calculations and storage are executed purely client-side inside your browser environment.

---

## 📜 License

Distributed under the MIT License. Feel free to fork, modify, and customize Ledger for your personal or commercial use!
