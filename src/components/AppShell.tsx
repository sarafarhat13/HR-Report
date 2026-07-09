import { useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModusWcNavbar } from '@trimble-oss/moduswebcomponents-react';
import type {
  INavbarUserCard,
  INavbarVisibility,
  ModusWcSelectCustomEvent,
} from '@trimble-oss/moduswebcomponents';
import { ROLE_ROUTES, useRole, type Role } from '../roles';
import IconRail from './IconRail';
import RoleSwitcher from './RoleSwitcher';

const NAVBAR_VISIBILITY: INavbarVisibility = {
  ai: false,
  apps: true,
  help: true,
  logo: true,
  mainMenu: true,
  notifications: true,
  search: false,
  searchInput: false,
  user: true,
};

const USER_CARD: INavbarUserCard = {
  avatarAlt: 'HR Administrator',
  email: 'admin@viewpoint.com',
  name: 'HR Administrator',
};

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const role = useRole();
  const navigate = useNavigate();

  const handleRoleChange = useCallback(
    (e: ModusWcSelectCustomEvent<InputEvent>) => {
      const next = e.target?.value as Role | undefined;
      if (next && next !== role) {
        navigate(ROLE_ROUTES[next]);
      }
    },
    [navigate, role]
  );

  return (
    <div className="app-root">
      <ModusWcNavbar
        className="app-navbar"
        visibility={NAVBAR_VISIBILITY}
        userCard={USER_CARD}
      >
        <div slot="start" className="navbar-start">
          <span className="navbar-title">Viewpoint HR Management</span>
          <RoleSwitcher value={role} onRoleChange={handleRoleChange} />
        </div>
        <div slot="main-menu" className="navbar-main-menu">
          Viewpoint HR Management
        </div>
      </ModusWcNavbar>

      <div className="app-body">
        <IconRail role={role} />

        <div className="app-main">
          <header className="page-title-bar">Paystub Audit Report</header>

          <div className="app-workspace">
            <main className="app-content">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
