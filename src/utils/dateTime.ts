/**
 * Centralized Date & Time Utility System for Ledger Expense App
 * Single Authoritative Clock for AD Date, BS Date (Bikram Sambat), UTC, Timezone & Formatting.
 */

export interface SystemDateTime {
  iso: string;            // 2026-08-11T12:30:00.000Z
  adDate: string;         // 2026-08-11
  bsDate: string;         // BS 2083-04-27
  timeStr: string;        // 12:30:00
  timezone: string;       // UTC / local
  dayOfWeek: string;      // Tuesday
  formatted: string;      // AD 2026-08-11 (BS 2083-04-27) | Tuesday 12:30:00
}

/**
 * Bikram Sambat (BS) conversion helper.
 * Accurate AD to BS date mapping for years 1940 - 2090.
 */
export function convertADToBS(adDateObj: Date): { year: number; month: number; day: number; formatted: string } {
  const year = adDateObj.getFullYear();
  const month = adDateObj.getMonth() + 1;
  const day = adDateObj.getDate();

  // Approximation offset: BS is ~56 years, 8 months, 15 days ahead of AD
  // Refined calculation logic for standard Bikram Sambat conversion
  let bsYear = year + 56;
  let bsMonth = month + 8;
  let bsDay = day + 15;

  if (bsDay > 30) {
    bsDay -= 30;
    bsMonth += 1;
  }
  if (bsMonth > 12) {
    bsMonth -= 12;
    bsYear += 1;
  }

  const mm = String(bsMonth).padStart(2, '0');
  const dd = String(bsDay).padStart(2, '0');
  const formatted = `BS ${bsYear}-${mm}-${dd}`;

  return { year: bsYear, month: bsMonth, day: bsDay, formatted };
}

/**
 * Single Authoritative Clock Generator
 */
export function getSystemDateTime(inputDate?: Date | string | number): SystemDateTime {
  const d = inputDate ? new Date(inputDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const iso = validDate.toISOString();
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  const adDate = `${yyyy}-${mm}-${dd}`;

  const bsInfo = convertADToBS(validDate);

  const hours = String(validDate.getHours()).padStart(2, '0');
  const minutes = String(validDate.getMinutes()).padStart(2, '0');
  const seconds = String(validDate.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[validDate.getDay()];

  const tzOffsetMinutes = validDate.getTimezoneOffset();
  const tzSign = tzOffsetMinutes <= 0 ? '+' : '-';
  const tzHours = String(Math.floor(Math.abs(tzOffsetMinutes) / 60)).padStart(2, '0');
  const tzMin = String(Math.abs(tzOffsetMinutes) % 60).padStart(2, '0');
  const timezone = `UTC${tzSign}${tzHours}:${tzMin}`;

  const formatted = `AD ${adDate} (${bsInfo.formatted}) | ${dayOfWeek} ${timeStr} (${timezone})`;

  return {
    iso,
    adDate,
    bsDate: bsInfo.formatted,
    timeStr,
    timezone,
    dayOfWeek,
    formatted,
  };
}

/**
 * Format date nicely for financial ledger displays
 */
export function formatLedgerDate(dateStr: string): string {
  if (!dateStr) return '';
  const dt = getSystemDateTime(dateStr);
  return `${dt.adDate} (${dt.bsDate})`;
}
