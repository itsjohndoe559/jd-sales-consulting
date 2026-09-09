import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getProducts, getTransactions, getOnHand } from '@/lib/data';
import { topProducts, topProductsByUnits } from '@/lib/analytics';
import { money, shortDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SYSTEM_PROMPT = `You are an AI assistant for JD Sales and Consulting, a clothing resale business.
You are given a summary of the business's all-time sales and inventory data below the question.
Answer only questions about sales data, products, revenue, profit, inventory, and margins.
Be concise: 1 to 3 sentences maximum.
If asked something outside the scope of this sales data — tax advice, legal advice, business strategy, forecasting, personal questions, or anything unrelated — politely decline and say you can only help with questions about the sales data.
Only use numbers present in the summary provided. Never invent or estimate a figure that isn't in it — if the summary doesn't have what's needed to answer, say so.`;

// Cheap, fast model - this is a simple Q&A-over-a-data-summary use case
// where a larger model would add cost with no real accuracy benefit.
const MODEL = 'claude-haiku-4-5-20251001';

export async function POST(req: NextRequest) {
  let question: string | undefined;
  try {
    const body = await req.json();
    question = body?.question;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!question || typeof question !== 'string' || !question.trim()) {
    return NextResponse.json(
      { success: false, error: 'A question is required.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'AI chat isn\u2019t configured yet (missing ANTHROPIC_API_KEY).',
      },
      { status: 500 }
    );
  }

  let data: {
    products: Awaited<ReturnType<typeof getProducts>>;
    transactions: Awaited<ReturnType<typeof getTransactions>>;
    onHand: Awaited<ReturnType<typeof getOnHand>>;
  };
  try {
    const [products, transactions, onHand] = await Promise.all([
      getProducts(),
      getTransactions(),
      getOnHand(),
    ]);
    data = { products, transactions, onHand };
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not load sales data.' },
      { status: 500 }
    );
  }
  const { products, transactions, onHand } = data;

  const active = transactions.filter((t) => !t.voided);
  const totalRevenue = active.reduce((s, t) => s + t.total, 0);
  const totalUnits = active.reduce(
    (s, t) => s + t.items.reduce((s2, i) => s2 + i.qty, 0),
    0
  );

  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  let cogs = 0;
  let missingCost = false;
  for (const t of active) {
    for (const item of t.items) {
      const cost = costBySku.get(item.sku);
      if (cost === null || cost === undefined) missingCost = true;
      else cogs += cost * item.qty;
    }
  }
  const avgMargin =
    !missingCost && totalRevenue > 0
      ? Math.round(((totalRevenue - cogs) / totalRevenue) * 100)
      : null;

  const topByRevenue = topProducts(active, 5);
  const topByUnits = topProductsByUnits(active, 5);

  const timestamps = active.map((t) => new Date(t.created_at).getTime());
  const dateRange =
    timestamps.length > 0
      ? `${shortDate(new Date(Math.min(...timestamps)).toISOString())} to ${shortDate(
          new Date(Math.max(...timestamps)).toISOString()
        )}`
      : 'No sales recorded yet';

  const lowStock = products
    .map((p) => ({ sku: p.sku, name: p.name, onHand: onHand[p.sku] ?? 0 }))
    .filter((p) => p.onHand < 10);

  const summary = `BUSINESS DATA SUMMARY (all-time, as of now):
- Total revenue: ${money(totalRevenue)}
- Total units sold: ${totalUnits}
- Total transactions: ${active.length}
- Date range of sales: ${dateRange}
- Average margin: ${
    avgMargin === null
      ? 'incomplete (some sold SKUs are still missing cost data)'
      : `${avgMargin}%`
  }
- Top 5 SKUs by revenue: ${
    topByRevenue.length
      ? topByRevenue.map((p) => `${p.name} (${p.sku}): ${money(p.revenue)}`).join(', ')
      : 'none yet'
  }
- Top 5 SKUs by units sold: ${
    topByUnits.length
      ? topByUnits.map((p) => `${p.name} (${p.sku}): ${p.units} units`).join(', ')
      : 'none yet'
  }
- Current on-hand inventory per SKU: ${products
    .map((p) => `${p.sku}: ${onHand[p.sku] ?? 0}`)
    .join(', ')}
- Low stock (under 10 units on hand): ${
    lowStock.length
      ? lowStock.map((p) => `${p.name} (${p.sku}): ${p.onHand}`).join(', ')
      : 'none'
  }`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `${summary}\n\nQuestion: ${question}` }],
    });

    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim();

    return NextResponse.json({ success: true, answer });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not reach the AI service. Try again in a moment.' },
      { status: 500 }
    );
  }
}
