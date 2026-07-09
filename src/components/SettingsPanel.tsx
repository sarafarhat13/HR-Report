import { ModusWcIcon } from '@trimble-oss/moduswebcomponents-react';
import { REPORT_ITEM_LABEL, ROLE_NAV, type Role } from '../roles';

interface SettingsPanelProps {
  role: Role;
}

/** The secondary navigation panel: a stack of card-style menu items where the
 *  Paystub Audit Report is the active selection. */
export default function SettingsPanel({ role }: SettingsPanelProps) {
  const { items } = ROLE_NAV[role];

  return (
    <nav className="settings-panel" aria-label="Section navigation">
      {items.map((item) => {
        const active = item.label === REPORT_ITEM_LABEL;
        return (
          <button
            key={item.label}
            type="button"
            className={`settings-card${active ? ' settings-card--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (!active) {
                console.log(`Navigate to ${item.label}`);
              }
            }}
          >
            <ModusWcIcon name={item.icon} size="sm" decorative />
            <span className="settings-card-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
