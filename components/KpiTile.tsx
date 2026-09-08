export default function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'red' | 'green' | 'none';
}) {
  const borderColor =
    accent === 'red'
      ? 'border-t-jdred'
      : accent === 'green'
      ? 'border-t-jdgreen'
      : 'border-t-transparent';

  return (
    <div className={`card border-t-2 ${borderColor} p-4`}>
      <div className="text-[11px] tracking-wide text-slate uppercase">
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 tabular">{value}</div>
      {sub && <div className="text-xs text-jdgreen mt-1">{sub}</div>}
    </div>
  );
}
