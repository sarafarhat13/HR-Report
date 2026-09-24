import { ROLE_LABELS, type Role } from '../roles';
import type { CheckRecord } from './mockData';

export interface PaystubDownloadAuditEntry {
  id: string;
  checkNumber: string;
  checkDate: string;
  employeeCode: string;
  companyCode: string;
  /** ISO 8601 timestamp when the download was initiated. */
  downloadedAt: string;
  /** Display name of the admin who downloaded the paystub. */
  downloadedBy: string;
  userRole: Role;
}

const STORAGE_KEY = 'paystub-audit-report-download-log';

/** Mock signed-in user for the MVP role switcher (production would come from auth). */
export function getMockCurrentUser(role: Role): { userId: string; displayName: string } {
  if (role === 'globalAdmin') {
    return { userId: 'ACHEN', displayName: 'Alex Chen' };
  }
  return { userId: 'JLEE', displayName: 'Jordan Lee' };
}

export function formatAuditTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function loadPaystubDownloadAuditLog(): PaystubDownloadAuditEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAuditEntry);
  } catch {
    return [];
  }
}

function persistPaystubDownloadAuditLog(entries: PaystubDownloadAuditEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode — in-memory updates still work for the session */
  }
}

function isAuditEntry(value: unknown): value is PaystubDownloadAuditEntry {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.checkNumber === 'string' &&
    typeof row.downloadedAt === 'string' &&
    typeof row.downloadedBy === 'string' &&
    (row.userRole === 'globalAdmin' || row.userRole === 'hrAdmin')
  );
}

export function recordPaystubDownload(
  check: CheckRecord,
  role: Role
): PaystubDownloadAuditEntry {
  const user = getMockCurrentUser(role);
  const entry: PaystubDownloadAuditEntry = {
    id: `${Date.now()}-${check.checkNumber}`,
    checkNumber: check.checkNumber,
    checkDate: check.checkDate,
    employeeCode: check.employeeCode,
    companyCode: check.companyCode,
    downloadedAt: new Date().toISOString(),
    downloadedBy: `${user.displayName} (${user.userId})`,
    userRole: role,
  };

  const next = [entry, ...loadPaystubDownloadAuditLog()];
  persistPaystubDownloadAuditLog(next);
  return entry;
}

export function clearPaystubDownloadAuditLog(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Downloads the audit log as a CSV report (MVP — production would use a secured export API). */
export function downloadPaystubAuditLogReport(entries: PaystubDownloadAuditEntry[]): void {
  const headers = [
    'Downloaded on',
    'Downloaded by',
    'Check number',
    'Check date',
    'Employee code',
    'Company code',
    'User role',
  ];

  const rows = entries.map((entry) => [
    formatAuditTimestamp(entry.downloadedAt),
    entry.downloadedBy,
    entry.checkNumber,
    entry.checkDate,
    entry.employeeCode,
    entry.companyCode,
    ROLE_LABELS[entry.userRole],
  ]);

  const csv = [headers, ...rows].map((line) => line.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `paystub-download-audit-log-${stamp}.csv`;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}
