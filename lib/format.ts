// All these pages render server-side on Vercel, where the server clock runs
// in UTC. Without an explicit timeZone, dates/times would display in UTC
// instead of the business's actual local time (the bug that showed 11:14
// instead of 4:14). Hardcoded to Pacific to match Dominic/Visalia; change
// this one constant if JD Sales' operating timezone is ever different.
export const BUSINESS_TIMEZONE = 'America/Los_Angeles';

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

export function longDate(dateStr: string) {
  // dateStr is a plain 'YYYY-MM-DD' calendar date (no time component), so
  // parse it as UTC-noon to sidestep any timezone shifting the day itself.
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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

/** Today's date as 'YYYY-MM-DD' in the business's local timezone. */
export function todayInBusinessTz() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Given a plain 'YYYY-MM-DD' calendar date, returns the UTC instants for
 * midnight-to-midnight of that date IN the business's local timezone.
 * Needed because transactions are stored as UTC timestamps — querying
 * "that day" by UTC midnight would clip off a chunk of the actual local
 * business day (same root cause as the earlier timestamp display bug).
 */
export function businessDayRange(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);

  function localToUtc(hour: number, minute: number, second: number) {
    // Standard converge-in-two-passes trick: guess a UTC instant, check
    // what that instant looks like when rendered in the target timezone,
    // and correct by the difference. Two passes is always enough since
    // timezone offsets only take a handful of discrete values.
    let guess = Date.UTC(y, m - 1, d, hour, minute, second);
    for (let i = 0; i < 2; i++) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: BUSINESS_TIMEZONE,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(new Date(guess));
      const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
      const renderedHour = get('hour') === 24 ? 0 : get('hour');
      const renderedAsUtc = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        renderedHour,
        get('minute'),
        get('second')
      );
      guess -= renderedAsUtc - guess;
    }
    return new Date(guess);
  }

  return {
    start: localToUtc(0, 0, 0),
    end: localToUtc(23, 59, 59),
  };
}

/** Channel bucket used for the Cash/Digital filter chips. */
export function channelFor(method: string): 'Cash' | 'Digital' {
  return method === 'Cash' ? 'Cash' : 'Digital';
}
