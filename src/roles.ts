import { useLocation } from 'react-router-dom';

export type Role = 'globalAdmin' | 'hrAdmin';

/** Canonical route for each role. Role is derived from (and reflected in) the URL. */
export const ROLE_ROUTES: Record<Role, string> = {
  globalAdmin: '/global-admin/paystub-audit',
  hrAdmin: '/reports-admin/paystub-audit',
};

export const ROLE_LABELS: Record<Role, string> = {
  globalAdmin: 'Global Admin',
  hrAdmin: 'HR Admin',
};

/** The active Paystub Audit Report item, shared by both role panels. */
export const REPORT_ITEM_LABEL = 'Paystub Audit Report';

export interface NavItem {
  label: string;
  icon: string;
}

export interface RoleNav {
  /** Workspace section title (also used as the breadcrumb group). */
  sectionTitle: string;
  /** Which top-level icon-rail entry is highlighted for this role. */
  railIcon: string;
  /** Secondary-panel items; `REPORT_ITEM_LABEL` is the active one. */
  items: NavItem[];
}

/**
 * The navigation each role reaches the report through:
 *   Global Admin: Icon rail (Settings) -> Admin Settings -> Paystub Audit Report
 *   HR Admin:     Icon rail (Reports)  -> Reports        -> Paystub Audit Report
 */
export const ROLE_NAV: Record<Role, RoleNav> = {
  globalAdmin: {
    sectionTitle: 'Admin Settings',
    railIcon: 'settings',
    items: [
      { label: 'Enterprise Settings', icon: 'building_corporate' },
      { label: 'Permission Groups', icon: 'user_permissions' },
      { label: 'Personal Info Settings', icon: 'person' },
      { label: 'Notification Settings', icon: 'notifications' },
      { label: 'Earning Settings', icon: 'costs' },
      { label: REPORT_ITEM_LABEL, icon: 'earnings_statement' },
    ],
  },
  hrAdmin: {
    sectionTitle: 'Reports',
    railIcon: 'document',
    items: [
      { label: 'Payroll Register', icon: 'file_table' },
      { label: 'Employee Roster', icon: 'people_group' },
      { label: 'Tax Summary', icon: 'invoice' },
      { label: REPORT_ITEM_LABEL, icon: 'earnings_statement' },
    ],
  },
};

/** Derives the active role from the current route so it survives refreshes/deep links. */
export function useRole(): Role {
  const { pathname } = useLocation();
  return pathname.startsWith(ROLE_ROUTES.hrAdmin) ? 'hrAdmin' : 'globalAdmin';
}
