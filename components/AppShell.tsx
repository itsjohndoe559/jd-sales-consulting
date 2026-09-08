'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:flex min-h-screen">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-white sticky top-0 z-30">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-2xl leading-none px-1"
        >
          ☰
        </button>
        <div className="text-xl font-bold leading-none">
          <span className="text-jdred">J</span>
          <span className="text-jdgreen">D</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Overlay behind the mobile drawer */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <Sidebar open={open} onNavigate={() => setOpen(false)} />

      <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
    </div>
  );
}
