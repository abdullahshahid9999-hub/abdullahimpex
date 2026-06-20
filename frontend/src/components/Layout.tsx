import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  HandCoins,
  FileText,
  Truck,
  Users,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/stock', label: 'Stock', icon: Boxes },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: HandCoins },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

function CrescentMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <path
        d="M62 8C40 8 22 26 22 50s18 42 40 42c6 0 12-1.3 17-3.7C66 93 53 98 39 98 17.5 98 0 76.6 0 50S17.5 2 39 2c14 0 27 5 23 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Layout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="relative flex w-60 flex-col border-r border-line bg-ink text-white">
        <CrescentMark className="pointer-events-none absolute -bottom-10 -left-16 h-56 w-56 text-white/[0.04]" />
        <div className="relative z-10 px-6 py-6">
          <p className="font-display text-lg font-bold leading-tight">M Riaz Trading</p>
          <p className="mt-0.5 text-xs text-white/50">Inventory &amp; Billing</p>
        </div>
        <nav className="relative z-10 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="relative z-10 border-t border-white/10 px-3 py-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
