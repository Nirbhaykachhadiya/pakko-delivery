'use client';

import { productTotals, shortName } from '@/lib/products';

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

/**
 * Totals up every product across the orders on screen, so the rider knows what
 * to pick up before leaving and the admin sees the same at a glance. Counts
 * units, not orders - three of one item in a single order counts as three.
 *
 * Pass `value` and `onChange` to make the chips a filter: tapping one narrows
 * the list to the orders carrying that item, tapping it again clears it.
 */
export default function ProductSummary({ orders, tone = 'blue', value, onChange }) {
  const t = TONES[tone] || TONES.blue;
  const rows = productTotals(orders);

  if (rows.length === 0) return null;

  const grand = rows.reduce((sum, r) => sum + r.qty, 0);
  const pickable = typeof onChange === 'function';
  const picked = pickable ? rows.find((r) => r.key === value) : null;

  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${t.wrap}`}>
      <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>
        <span>Items to carry · {grand} total</span>
        {picked && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-auto rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal underline"
          >
            Clear
          </button>
        )}
      </div>

      {pickable && (
        <p className={`mt-1 text-[11px] font-medium ${t.label} opacity-80`}>
          {picked
            ? `Showing the ${picked.orders} ${picked.orders === 1 ? 'order' : 'orders'} with ${picked.name}`
            : 'Tap an item to see just those orders'}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap gap-2">
        {rows.map((r) => {
          const on = picked?.key === r.key;
          const dim = picked && !on;

          if (!pickable) {
            return (
              <span
                key={r.key}
                title={r.name}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold ${t.chip}`}
              >
                {shortName(r.name)}
                <span className="tabular-nums opacity-90">({r.qty})</span>
              </span>
            );
          }

          return (
            <button
              key={r.key}
              type="button"
              title={`${r.name} · ${r.qty} units across ${r.orders} orders`}
              onClick={() => onChange(on ? '' : r.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold transition-opacity ${
                t.chip
              } ${on ? 'ring-2 ring-black/40' : dim ? 'opacity-45' : ''}`}
            >
              {shortName(r.name)}
              <span className="tabular-nums opacity-90">({r.qty})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
