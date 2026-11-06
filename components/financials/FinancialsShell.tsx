'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Week } from '@/lib/financials';

const NAV = [
  { href: '/financials', label: 'Dashboard' },
  { href: '/financials/ledger', label: 'Ledger' },
  { href: '/financials/deductions', label: 'Deductions' },
];

export default function FinancialsShell({
  weeks,
  children,
}: {
  weeks: Week[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const activeWeek = pathname.startsWith('/financials/week/')
    ? pathname.split('/')[3]
    : '';

  return (
    <div className="md:flex min-h-screen">
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-ink text-white flex flex-col z-50 transform transition-transform duration-200 md:static md:translate-x-0 md:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6">
          <div className="text-2xl font-bold leading-none">
            <span className="text-jdred">J</span>
            <span className="text-jdgreen">D</span>
          </div>
          <div className="text-[10px] tracking-wide text-slate mt-1">FINANCIALS</div>
        </div>

        <nav className="flex-1 px-2">
          {NAV.map((item) => {
            const active =
              item.href === '/financials' ? pathname === '/financials' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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

          <div className="px-3 mt-4">
            <div className="text-[10px] tracking-wide text-slate uppercase mb-1">Week</div>
            <select
              value={activeWeek}
              onChange={(e) => {
                if (!e.target.value) return;
                setOpen(false);
                router.push(`/financials/week/${e.target.value}`);
              }}
              className={`w-full bg-paper border rounded px-2 py-1.5 text-sm ${
                activeWeek ? 'border-jdred text-white' : 'border-line text-slate'
              }`}
            >
              <option value="">Choose a week</option>
              {[...weeks].reverse().map((w) => (
                <option key={w.start} value={w.start}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </nav>

        <div className="px-5 py-4">
          <Link href="/" className="text-[11px] text-slate hover:text-white">
            &larr; Back to site
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-line bg-ink sticky top-0 z-30">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-2xl leading-none px-1 text-white">
            ☰
          </button>
          <div className="text-xl font-bold leading-none">
            <span className="text-jdred">J</span>
            <span className="text-jdgreen">D</span>
          </div>
          <div className="text-[10px] tracking-wide text-slate">FINANCIALS</div>
        </div>
        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
