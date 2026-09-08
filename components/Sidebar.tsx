'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/pnl', label: 'P&L' },
  { href: '/invoices', label: 'Invoices' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 bg-ink text-white min-h-screen flex flex-col">
      <div className="px-5 py-6">
        <div className="text-2xl font-bold leading-none">
          <span className="text-jdred">J</span>
          <span className="text-jdgreen">D</span>
        </div>
        <div className="text-[10px] tracking-wide text-slate mt-1">
          JD SALES &amp; CONSULTING
        </div>
      </div>

      <nav className="flex-1 px-2">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 mb-1 rounded text-sm border-l-2 ${
                active
                  ? 'bg-white/10 border-jdred text-white'
                  : 'border-transparent text-slate hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4">
        <button
          onClick={logout}
          className="text-[11px] text-slate hover:text-white"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
