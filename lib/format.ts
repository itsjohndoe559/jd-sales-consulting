// All these pages render server-side on Vercel, where the server clock runs
// in UTC. Without an explicit timeZone, dates/times would display in UTC
// instead of the business's actual local time (the bug that showed 11:14
// instead of 4:14). Hardcoded to Pacific to match Dominic/Visalia; change
// this one constant if JD Sales' operating timezone is ever different.
const BUSINESS_TIMEZONE = 'America/Los_Angeles';

export function money(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  });
}

export function dateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  });
}

/** Channel bucket used for the Cash/Digital filter chips. */
export function channelFor(method: string): 'Cash' | 'Digital' {
  return method === 'Cash' ? 'Cash' : 'Digital';
}
