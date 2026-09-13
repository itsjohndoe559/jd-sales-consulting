'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAddSale } from './AddSaleContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { setOpen: setAddSaleOpen } = useAddSale();

  return (
    <div className="md:flex min-h-screen">
      {/* Overlay behind the mobile drawer */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <Sidebar open={open} onNavigate={() => setOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky top bar - always visible. Hamburger + logo are mobile-only
            (desktop's sidebar is permanent, no drawer to toggle, and already
            shows its own logo); Add Sale stays visible on every size. */}
        <div className="flex items-center justify-between md:justify-end gap-3 px-4 py-3 border-b border-line bg-ink sticky top-0 z-30">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="md:hidden text-2xl leading-none px-1 text-white"
          >
            ☰
          </button>
          <div className="md:hidden text-xl font-bold leading-none">
            <span className="text-jdred">J</span>
            <span className="text-jdgreen">D</span>
          </div>
          <button
            onClick={() => setAddSaleOpen(true)}
            className="bg-jdred text-white rounded-full px-4 py-1.5 text-sm font-medium shadow-sm"
          >
            + Add Sale
          </button>
        </div>

        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
