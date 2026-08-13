/**
 * Ledger Expense Application Single Source of Truth Version & Release Registry
 */

import { getSystemDateTime, SystemDateTime } from './utils/dateTime';

export interface AppReleaseInfo {
  version: string;
  updateNumber: number;
  updateTag: string;
  releasedAt: SystemDateTime;
  gitCommitSha: string;
  repository: string;
}

const CURRENT_UPDATE_NUMBER = 28;
const CURRENT_APP_VERSION = '2.4.0';

export function getAppReleaseInfo(): AppReleaseInfo {
  const dt = getSystemDateTime();
  return {
    version: CURRENT_APP_VERSION,
    updateNumber: CURRENT_UPDATE_NUMBER,
    updateTag: `Update #${CURRENT_UPDATE_NUMBER}`,
    releasedAt: dt,
    gitCommitSha: '45c5a3f',
    repository: 'sdxbyte/Expense',
  };
}
