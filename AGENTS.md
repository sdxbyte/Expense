# Ledger Application Permanent Rules & System Guidelines

## Permanent Rules for All Updates

1. **Automatic Synchronization (Autosync)**
   - All state updates (adding/editing expenses, reversing entries, settling debts, setting budgets, creating custom categories/currencies) MUST automatically call `synchronizeData()` and refresh user state.
   - Background auto-sync interval runs periodically to ensure seamless cloud & local DB state synchronization.

2. **User Account & Registration Requirements**
   - When creating an account (sign up), the following fields are strictly required:
     - **Email Address** (valid format)
     - **Phone Number** (mandatory field)
     - **Password with Strict Complexity Rules**:
       - Minimum 8 characters long
       - At least one uppercase letter (A-Z)
       - At least one numeric digit (0-9)
       - At least one special character (`!@#$%^&*()_+-=[]{};':"\\|,.<>/?`)

3. **Public View Cleanliness & Privacy Assurance**
   - Do NOT display internal development logs, internal architecture names, or unnecessary technical remarks in public views or footers.
   - Maintain a polished, professional interface suitable for public deployment (e.g. Vercel, Cloud Run).

4. **GitHub & Repository Auto-Synchronization**
   - Automatically record, persist, and synchronize all code updates, database entries, state features, and system guidelines to `https://github.com/sdxbyte/Expense` (`main` branch) across every single update turn.
   - Keep the codebase fully prepared, auto-pushed, and compliant for GitHub export and live preview deployments (e.g. Vercel, Cloud Run).
