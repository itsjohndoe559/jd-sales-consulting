import { money, longDate } from './format';
import type { DailyReportData } from './types';

// Configurable via env var so switching from the Resend sandbox address to
// a verified jdconsultingllc.org address later doesn't need a code change -
// just set RESEND_FROM_ADDRESS in Vercel and redeploy. Defaults to Resend's
// sandbox address, which works immediately with no domain verification;
// sending from an unverified custom domain fails silently rather than
// erroring loudly, so defaulting to something guaranteed to work avoids
// that trap while jdconsultingllc.org verification is still pending.
const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || 'JD Sales Reports <onboarding@resend.dev>';

export function buildDailyReportEmail(data: DailyReportData): string {
  const incomplete = data.cogs === null;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#6B7480;border-bottom:1px solid #E6E8EA;">${label}</td>
      <td style="padding:6px 0;text-align:right;font-weight:600;border-bottom:1px solid #E6E8EA;">${value}</td>
    </tr>`;

  const inventoryRows = data.inventoryChanges
    .map(
      (c) => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #E6E8EA;">${c.name} (${c.sku})</td>
      <td style="padding:6px 0;text-align:right;color:#146B4C;border-bottom:1px solid #E6E8EA;">${c.in > 0 ? `+${c.in}` : '—'}</td>
      <td style="padding:6px 0;text-align:right;color:#C8202F;border-bottom:1px solid #E6E8EA;">${c.out > 0 ? `-${c.out}` : '—'}</td>
      <td style="padding:6px 0;text-align:right;font-weight:600;border-bottom:1px solid #E6E8EA;">${c.net}</td>
    </tr>`
    )
    .join('');

  const lowStockRows = data.lowStock
    .map(
      (p) => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #E6E8EA;">${p.name} (${p.sku})</td>
      <td style="padding:6px 0;text-align:right;color:#C8202F;font-weight:600;border-bottom:1px solid #E6E8EA;">${p.onHand} left</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#FBFBFA;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14171A;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #E6E8EA;border-radius:10px;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div style="font-size:24px;font-weight:800;line-height:1;">
          <span style="color:#C8202F;">J</span><span style="color:#146B4C;">D</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:700;">Daily Report</div>
          <div style="font-size:12px;color:#6B7480;">${longDate(data.reportDate)}</div>
        </div>
      </div>

      <table width="100%" style="border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="width:50%;padding:12px;border:1px solid #E6E8EA;border-radius:8px;">
            <div style="font-size:10px;text-transform:uppercase;color:#6B7480;">Revenue</div>
            <div style="font-size:18px;font-weight:700;">${money(data.dailyRevenue)}</div>
          </td>
          <td style="width:12px;"></td>
          <td style="width:50%;padding:12px;border:1px solid #E6E8EA;border-radius:8px;">
            <div style="font-size:10px;text-transform:uppercase;color:#6B7480;">Profit</div>
            <div style="font-size:18px;font-weight:700;">${
              data.dailyProfit === null ? 'Incomplete' : money(data.dailyProfit)
            }</div>
          </td>
        </tr>
      </table>

      ${
        incomplete
          ? `<div style="font-size:12px;color:#C8202F;margin-bottom:16px;">Profit is incomplete — ${data.missingCostSkus.join(', ')} still missing cost.</div>`
          : ''
      }

      <div style="font-size:14px;font-weight:700;margin-bottom:6px;">Profit &amp; Loss</div>
      <table width="100%" style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        ${row('Revenue', money(data.dailyRevenue))}
        ${row('COGS', data.cogs === null ? '—' : `-${money(data.cogs)}`)}
        ${row('Net Profit', data.dailyProfit === null ? 'Incomplete' : money(data.dailyProfit))}
        ${row('Transactions', String(data.transactionCount))}
      </table>

      ${
        data.inventoryChanges.length > 0
          ? `<div style="font-size:14px;font-weight:700;margin-bottom:6px;">Inventory Changes</div>
      <table width="100%" style="border-collapse:collapse;font-size:13px;margin-bottom:20px;">
        <tr style="color:#6B7480;font-size:11px;text-transform:uppercase;">
          <td style="padding-bottom:4px;">SKU</td>
          <td style="padding-bottom:4px;text-align:right;">In</td>
          <td style="padding-bottom:4px;text-align:right;">Out</td>
          <td style="padding-bottom:4px;text-align:right;">Net</td>
        </tr>
        ${inventoryRows}
      </table>`
          : ''
      }

      ${
        data.lowStock.length > 0
          ? `<div style="font-size:14px;font-weight:700;margin-bottom:6px;">Low Stock Alerts</div>
      <table width="100%" style="border-collapse:collapse;font-size:13px;margin-bottom:8px;">
        ${lowStockRows}
      </table>`
          : ''
      }

      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #E6E8EA;font-size:12px;color:#6B7480;">
        <a href="https://jd-sales-consulting.vercel.app/reports" style="color:#C8202F;text-decoration:none;">View full dashboard &rarr;</a>
      </div>
    </div>
  </div>
</body>
</html>`.trim();
}

/** Plain-text fallback for the report email - some clients (and Gmail's
 * collapsed-thread preview) show this instead of the HTML body, so without
 * it certain views can render as blank even though the HTML part is fine. */
export function buildDailyReportEmailText(data: DailyReportData): string {
  const lines = [
    `JD Sales Daily Report - ${longDate(data.reportDate)}`,
    '',
    `Revenue: ${money(data.dailyRevenue)}`,
    `Profit: ${data.dailyProfit === null ? 'Incomplete (some SKUs missing cost)' : money(data.dailyProfit)}`,
    `COGS: ${data.cogs === null ? 'n/a' : money(data.cogs)}`,
    `Transactions: ${data.transactionCount}`,
  ];

  if (data.inventoryChanges.length > 0) {
    lines.push('', 'Inventory Changes:');
    for (const c of data.inventoryChanges) {
      lines.push(`  ${c.name} (${c.sku}): in ${c.in}, out ${c.out}, net ${c.net}`);
    }
  }

  if (data.lowStock.length > 0) {
    lines.push('', 'Low Stock Alerts:');
    for (const p of data.lowStock) {
      lines.push(`  ${p.name} (${p.sku}): ${p.onHand} left`);
    }
  }

  lines.push('', 'View full dashboard: https://jd-sales-consulting.vercel.app/reports');
  return lines.join('\n');
}

/** Thin wrapper over Resend's REST API - no SDK dependency needed for one call. */
export async function sendEmail(to: string[], subject: string, html: string, text?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }
  if (to.length === 0) {
    throw new Error('No recipients configured (REPORT_EMAIL_RECIPIENTS is empty).');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, ...(text ? { text } : {}) }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }

  return { emailsSent: to.length };
}

export function reportEmailRecipients(): string[] {
  return (process.env.REPORT_EMAIL_RECIPIENTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
