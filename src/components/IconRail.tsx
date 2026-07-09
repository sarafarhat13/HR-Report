import { ModusWcIcon } from '@trimble-oss/moduswebcomponents-react';
import { ROLE_NAV, type Role } from '../roles';

interface RailEntry {
  icon: string;
  label: string;
}

/** Top-level application areas. Only the entry matching the active role's
 *  `railIcon` is highlighted; the rest are illustrative placeholders. */
const RAIL_ENTRIES: RailEntry[] = [
  { icon: 'person', label: 'People' },
  { icon: 'costs', label: 'Payroll' },
  { icon: 'clock', label: 'Time' },
  { icon: 'people_group', label: 'Teams' },
  { icon: 'briefcase', label: 'Benefits' },
  { icon: 'heart', label: 'Wellness' },
  { icon: 'document', label: 'Reports' },
  { icon: 'wrench', label: 'Tools' },
  { icon: 'file', label: 'Documents' },
  { icon: 'settings', label: 'Admin Settings' },
  { icon: 'manage_accounts', label: 'User Admin' },
];

interface IconRailProps {
  role: Role;
}

export default function IconRail({ role }: IconRailProps) {
  const activeIcon = ROLE_NAV[role].railIcon;

  return (
    <nav className="icon-rail" aria-label="Application areas">
      {RAIL_ENTRIES.map((entry) => {
        const active = entry.icon === activeIcon;
        return (
          <button
            key={entry.icon}
            type="button"
            className={`icon-rail-item${active ? ' icon-rail-item--active' : ''}`}
            aria-label={entry.label}
            aria-current={active ? 'page' : undefined}
            title={entry.label}
          >
            <ModusWcIcon name={entry.icon} size="sm" decorative />
            <ModusWcIcon
              customClass="icon-rail-chevron"
              name="chevron_right"
              size="xs"
              decorative
            />
          </button>
        );
      })}
    </nav>
  );
}
