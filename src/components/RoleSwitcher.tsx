import { ModusWcSelect } from '@trimble-oss/moduswebcomponents-react';
import type {
  ISelectOption,
  ModusWcSelectCustomEvent,
} from '@trimble-oss/moduswebcomponents';
import { ROLE_LABELS, type Role } from '../roles';

const ROLE_OPTIONS: ISelectOption[] = [
  { label: ROLE_LABELS.globalAdmin, value: 'globalAdmin' },
  { label: ROLE_LABELS.hrAdmin, value: 'hrAdmin' },
];

interface RoleSwitcherProps {
  value: Role;
  onRoleChange: (e: ModusWcSelectCustomEvent<InputEvent>) => void;
}

/**
 * Mock role switcher in the header shell so both navigation views can be
 * toggled and tested without real auth.
 */
export default function RoleSwitcher({ value, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="role-switcher-wrap">
      <span className="role-switcher-label">Viewing as</span>
      <ModusWcSelect
        aria-label="Switch user role"
        customClass="role-switcher-select"
        size="sm"
        options={ROLE_OPTIONS}
        value={value}
        onInputChange={onRoleChange}
      />
    </div>
  );
}
