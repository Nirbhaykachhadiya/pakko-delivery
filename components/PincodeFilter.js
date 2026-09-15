'use client';

import { useState } from 'react';
import { areaFor } from '@/lib/pincodes';

const TONE = {
  blue: { on: 'bg-brand-600 text-white', ring: 'ring-brand-200' },
  yellow: { on: 'bg-warn-500 text-warn-900', ring: 'ring-warn-500' },
  green: { on: 'bg-good-500 text-white', ring: 'ring-good-500' },
  red: { on: 'bg-stop-500 text-white', ring: 'ring-stop-500' },
};

/**
 * The pincode picker that sits under every tab.
 *
 * `stats` arrives already in delivery order - the pincode with the most orders
 * first, then its nearest neighbour, and so on - so the rider reads the list
 * top to bottom the same way they would ride it. Tapping one narrows the tab
 * to that area; tapping "All areas" puts everything back.
 */
export default function PincodeFilter({ stats, value, onChange, tone = 'blue' }) {
  const [open, setOpen] = useState(false);
  const t = TONE[tone] || TONE.blue;

  if (stats.length < 2) return null;

  const total = stats.reduce((n, s) => n + s.count, 0);
  const picked = stats.find((s) => s.pin === value);

  const label = picked
    ? `${picked.pin === 'unknown' ? 'No pincode' : picked.pin}${
        areaFor(picked.pin) ? ` · ${areaFor(picked.pin)}` : ''
      }`
    : `All areas · ${stats.length} pincodes`;

  const choose = (pin) => {
    onChange(pin);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`btn w-full justify-between px-3.5 py-2.5 text-sm ring-1 ${
          picked ? t.on : `bg-white text-ink-700 ring-ink-200 ${t.ring}`
        }`}
      >
        <span className="min-w-0 truncate font-semibold">{label}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-black/10 px-2 py-0.5 font-bold tabular-nums">
            {picked ? picked.count : total}
          </span>
          <span aria-hidden className="text-xs">
            {open ? '▲' : '▼'}
          </span>
        </span>
      </button>

      {open && (
        <div className="max-h-72 overflow-y-auto rounded-xl bg-white p-1.5 ring-1 ring-ink-200">
          <button
            onClick={() => choose('')}
            className={`btn w-full justify-between px-3 py-2.5 text-sm ${
              !picked ? t.on : 'bg-ink-50 text-ink-700'
            }`}
          >
            <span className="font-semibold">All areas</span>
            <span className="font-bold tabular-nums">{total}</span>
          </button>

          {stats.map((s, i) => {
            const on = s.pin === value;
            const area = areaFor(s.pin);
            return (
              <button
                key={s.pin}
                onClick={() => choose(s.pin)}
                className={`btn mt-1 w-full justify-between px-3 py-2.5 text-sm ${
                  on ? t.on : 'bg-white text-ink-700'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`w-5 shrink-0 text-right text-[11px] tabular-nums ${
                      on ? 'opacity-70' : 'text-ink-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block font-mono font-bold tabular-nums">
                      {s.pin === 'unknown' ? '—' : s.pin}
                    </span>
                    <span
                      className={`block truncate text-xs font-medium ${
                        on ? 'opacity-80' : 'text-ink-500'
                      }`}
                    >
                      {s.pin === 'unknown' ? 'No pincode' : area || 'Add area name'}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">{s.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
