import { z } from 'zod';

// Strict monetary amount validator (Positive finite number with at most 2 decimal places)
export const AmountSchema = z.number()
  .finite('Amount must be a finite number')
  .nonnegative('Amount cannot be negative')
  .max(1000000000, 'Amount exceeds maximum allowable threshold')
  .refine((val) => Number.isFinite(val) && !Number.isNaN(val), 'Amount cannot be NaN or Infinity')
  .refine((val) => Math.round(val * 100) === val * 100, 'Amount cannot have more than 2 decimal places');

export const ExpenseSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  amount: AmountSchema,
  currency: z.string().min(1, 'Currency is required').max(10, 'Currency code too long'),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().max(1000, 'Description too long'),
  source: z.enum(['self', 'borrowed']),
  paymentMethod: z.string().max(100).optional(),
  otherPaymentReason: z.string().max(200).optional(),
  lender: z.string().max(100).optional(),
  recurring: z.boolean().optional(),
  settled: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'REVERSED', 'AMENDED']).optional().default('ACTIVE'),
  reversalOf: z.string().nullable().optional(),
  reversalReason: z.string().nullable().optional(),
  reversedAt: z.string().nullable().optional(),
  version: z.number().int().min(1).optional().default(1),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

export const BudgetSchema = z.object({
  currency: z.string().min(1),
  category: z.string().min(1),
  amount: AmountSchema,
});

export const BackupDataSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  applicationVersion: z.string(),
  exportedAt: z.string(),
  exportedByUserId: z.string().optional(),
  data: z.object({
    expenses: z.array(ExpenseSchema),
    budgets: z.record(z.string(), AmountSchema),
    categories: z.array(z.string().min(1)),
    customCurrencies: z.array(z.string().min(1)),
    lenders: z.array(z.string().min(1)),
    settings: z.object({
      darkMode: z.boolean(),
      primaryCurrency: z.string(),
    }),
  }),
});

export type BackupSchemaV2 = z.infer<typeof BackupDataSchemaV2>;
