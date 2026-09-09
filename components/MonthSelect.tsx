'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { last12Months } from '@/lib/analytics';

export default function MonthSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const months = last12Months();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-line rounded px-2 py-1.5 text-sm bg-white"
    >
      {months.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
