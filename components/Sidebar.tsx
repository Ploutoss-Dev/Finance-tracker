'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Bitcoin,
  Receipt,
  Settings,
  Menu,
  X,
  CreditCard,
  Percent,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { usePrivacy } from '@/components/PrivacyProvider';

const nav = [
  { href: '/',        label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/income',  label: 'Income',           icon: TrendingUp },
  { href: '/expenses',label: 'Expenses',         icon: TrendingDown },
  { href: '/savings', label: 'Savings',          icon: PiggyBank },
  { href: '/bitcoin', label: 'Bitcoin DCA',      icon: Bitcoin },
  { href: '/crypto',  label: 'Crypto Portfolio', icon: Layers },
  { href: '/loans',   label: 'Loans',            icon: CreditCard },
  { href: '/yields',  label: 'APR / Yield',      icon: Percent },
  { href: '/tax',     label: 'Tax Overview',     icon: Receipt },
  { href: '/settings',label: 'Settings',         icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isPrivate, toggle } = usePrivacy();

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-gray-300 lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-40
          flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">FinanceTracker</h1>
              <p className="text-gray-500 text-xs">Personal Finance</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                  }
                `}
              >
                <Icon size={17} className={active ? 'text-emerald-400' : ''} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          {/* Privacy toggle */}
          <button
            onClick={toggle}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${isPrivate
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-gray-500 hover:text-white hover:bg-gray-800 border border-transparent'
              }
            `}
          >
            {isPrivate ? <EyeOff size={15} /> : <Eye size={15} />}
            {isPrivate ? 'Values hidden' : 'Hide values'}
          </button>
          <p className="text-gray-700 text-xs text-center">v1.2.0 — Local data only</p>
        </div>
      </aside>
    </>
  );
}
