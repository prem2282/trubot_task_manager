import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import AccountSwitcher from '../AccountSwitcher';
import WorkspaceSwitcher from '../WorkspaceSwitcher';
import { disconnectSocket } from '../../services/socket';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-100 text-indigo-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
  }`;

export default function TopNav() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    disconnectSocket();
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <Link
              to="/dashboard"
              aria-label="Home"
              className="shrink-0 p-1 text-indigo-600 transition-colors hover:text-indigo-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                className="h-7 w-7"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 10.5V20h11v-9.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20v-5h4v5" />
              </svg>
            </Link>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end lg:gap-3">
              <AccountSwitcher />
              <WorkspaceSwitcher />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between lg:border-t-0 lg:pt-0">
            <nav className="flex flex-wrap gap-1">
              <NavLink to="/dashboard" className={navLinkClass} end>
                TaskBoard
              </NavLink>
              <NavLink to="/settings/workspaces" className={navLinkClass}>
                Workspaces
              </NavLink>
              <NavLink to="/settings/team" className={navLinkClass}>
                Team
              </NavLink>
            </nav>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center lg:border-l lg:border-slate-200 lg:pl-4">
              <span className="truncate text-sm font-medium text-slate-700">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
