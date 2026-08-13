/**
 * Cryptographic & Sanitization Security Utilities
 * Protects against plaintext password storage, XSS, and CSV injection.
 */

/**
 * SHA-256 password hashing with salt using standard Web Crypto API.
 * Plaintext passwords MUST NEVER be stored in localStorage or database.
 */
export async function hashPassword(password: string, salt: string = 'ledger_app_salt_v2'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitizes user input string against HTML / Script XSS injection.
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escapes CSV values to prevent Spreadsheet Formula Injection (=, +, -, @, tab, cr).
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '""';
  const strVal = String(value);
  let clean = strVal.replace(/"/g, '""');

  // If value starts with formula triggers, prepend a single quote to disarm formula execution
  if (/^[=+\-@\t\r]/.test(clean)) {
    clean = "'" + clean;
  }

  return `"${clean}"`;
}

/**
 * Money Precision Handler: rounds financial values to 2 decimal places to prevent floating-point anomalies.
 * Rejects NaN, Infinity, and non-numeric inputs.
 */
export function roundMoney(amount: number | string): number {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(Math.abs(num) * 100) / 100;
}
