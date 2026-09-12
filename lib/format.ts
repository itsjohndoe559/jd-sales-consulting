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
  return businessDateStr(new Date().toISOString());
}

/** The Pacific-local calendar date, as 'YYYY-MM-DD', for any ISO timestamp. */
export function businessDateStr(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
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
    // Converge on the UTC instant whose Pacific-local rendering matches the
    // requested wall-clock time. Each pass re-derives the correction from
    // the FIXED target (targetAsUtc), not from the previous guess - doing
    // it against the previous guess (the earlier, buggy version of this
    // function) double-applies the correction on the 2nd pass and overshoots
    // by a full UTC offset, which silently shifted every day/week/month
    // boundary in the app 7-8 hours later than intended.
    const targetAsUtc = Date.UTC(y, m - 1, d, hour, minute, second);
    let guess = targetAsUtc;
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
      const offset = renderedAsUtc - guess;
      guess = targetAsUtc - offset;
    }
    return new Date(guess);
  }

  return {
    start: localToUtc(0, 0, 0),
    end: localToUtc(23, 59, 59),
  };
}

/** Adds n days to a 'YYYY-MM-DD' calendar-date string (pure calendar math). */
export function addDaysToDateStr(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Full weekday name (Monday, Tuesday, ...) in the business's local timezone. */
export function businessWeekday(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: BUSINESS_TIMEZONE,
  });
}

/** Channel bucket used for the Cash/Digital filter chips. */
export function channelFor(method: string): 'Cash' | 'Digital' {
  return method === 'Cash' ? 'Cash' : 'Digital';
}
