'use client';

export default function FilterChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              active ? 'bg-ink text-white' : 'bg-line/50 text-ink hover:bg-line'
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
