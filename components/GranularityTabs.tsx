'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const OPTIONS: { value: string; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function GranularityTabs({
  paramName,
  value,
}: {
  paramName: string;
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => select(o.value)}
          className={`px-2.5 py-1 rounded-full text-xs ${
            value === o.value ? 'bg-ink text-white' : 'bg-line/50 text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
