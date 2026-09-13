'use client';

const TONES = {
  blue: {
    wrap: 'bg-brand-50 ring-brand-200',
    chip: 'bg-brand-600 text-white',
    label: 'text-brand-800',
  },
  yellow: {
    wrap: 'bg-warn-50 ring-warn-500/40',
    chip: 'bg-warn-500 text-warn-900',
    label: 'text-warn-900',
  },
  green: {
    wrap: 'bg-good-50 ring-good-500/40',
    chip: 'bg-good-500 text-white',
    label: 'text-good-900',
  },
  red: {
    wrap: 'bg-stop-50 ring-stop-500/40',
    chip: 'bg-stop-500 text-white',
    label: 'text-stop-900',
  },
};

// "Bullet Massager with 9 Heads" -> "Bullet Mas"
function shortName(name, len = 10) {
  const clean = String(name || '').trim();
  return clean.length <= len ? clean : clean.slice(0, len).trim();
}

/**
 * Totals up every product across the orders currently on screen, so the
 * rider knows exactly how many units to pick up before leaving, and the
 * admin can see the same at a glance. Counts units, not orders - three of
 * one item in a single order counts as three.
 */
export default function ProductSummary({ orders, tone = 'blue' }) {
  const t = TONES[tone] || TONES.blue;

  const totals = new Map();
  for (const o of orders || []) {
    for (const p of o.products || []) {
      const key = String(p.name || '').trim();
      if (!key) continue;
      totals.set(key, (totals.get(key) || 0) + (Number(p.qty) || 0));
    }
  }

  if (totals.size === 0) return null;

  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grand = rows.reduce((sum, [, qty]) => sum + qty, 0);

  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${t.wrap}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>
        Items to carry · {grand} total
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {rows.map(([name, qty]) => (
          <span
            key={name}
            title={name}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold ${t.chip}`}
          >
            {shortName(name)}
            <span className="tabular-nums opacity-90">({qty})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
