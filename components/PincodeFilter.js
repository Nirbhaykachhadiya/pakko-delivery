'use client';

import { useState } from 'react';
import { areaFor, NO_PIN } from '@/lib/pincodes';

// Note: no `.btn` class anywhere below. `.btn` is unlayered CSS, so it beats
// Tailwind's layered utilities and force-centres every row. Plain flex here.
const TONES = {
  blue: 'bg-brand-600 text-white',
  yellow: 'bg-warn-500 text-warn-900',
  green: 'bg-good-500 text-white',
  red: 'bg-stop-500 text-white',
};

const labelFor = (pin) =>
  pin === NO_PIN ? 'No pincode' : areaFor(pin) || 'Add area name';

// Kept at module scope. Declared inside the component it would be a brand new
// component type on every render, so React would tear down and rebuild every
// row instead of updating it.
function Row({ rank, title, sub, count, on, solid, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
        on ? solid : 'bg-white text-ink-700 active:bg-ink-50'
      }`}
    >
      {rank != null && (
        <span
          className={`w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums ${
            on ? 'opacity-70' : 'text-ink-400'
          }`}
        >
          {rank}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[15px] font-bold leading-tight tabular-nums">
          {title}
        </span>
        <span
          className={`block truncate text-xs font-medium leading-tight ${
            on ? 'opacity-80' : 'text-ink-500'
          }`}
        >
          {sub}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${
          on ? 'bg-black/15' : 'bg-ink-100 text-ink-700'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * The pincode picker under every tab.
 *
 * `stats` arrives already in delivery order - busiest pincode first, then its
 * nearest neighbour - so the rider reads it the same way they ride it.
 * Tapping one narrows the list to that area; "All areas" puts it back.
 */
export default function PincodeFilter({ stats, value, onChange, tone = 'blue' }) {
  const [open, setOpen] = useState(false);
  const solid = TONES[tone] || TONES.blue;

  if (!stats || stats.length < 2) return null;

  const total = stats.reduce((n, s) => n + s.count, 0);
  const picked = stats.find((s) => s.pin === value);

  const choose = (pin) => {
    onChange(pin);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 ${
          picked ? `${solid} ring-transparent` : 'bg-white text-ink-700 ring-ink-200'
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold leading-tight">
            {picked
              ? picked.pin === NO_PIN
                ? 'No pincode'
                : picked.pin
              : 'All areas'}
          </span>
          <span
            className={`block truncate text-xs font-medium leading-tight ${
              picked ? 'opacity-80' : 'text-ink-500'
            }`}
          >
            {picked ? labelFor(picked.pin) : `${stats.length} pincodes · tap to pick`}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ${
            picked ? 'bg-black/15' : 'bg-ink-100 text-ink-700'
          }`}
        >
          {picked ? picked.count : total}
        </span>
        <span aria-hidden className={`shrink-0 text-[10px] ${picked ? '' : 'text-ink-400'}`}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <>
          {/* tap anywhere else to close, without stealing the first tap */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[60vh] overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl">
            <Row
              title="All areas"
              sub={`${stats.length} pincodes`}
              count={total}
              on={!picked}
              solid={solid}
              onClick={() => choose('')}
            />
            <div className="my-1 border-t border-ink-100" />
            {stats.map((s, i) => (
              <Row
                key={s.pin}
                rank={i + 1}
                title={s.pin === NO_PIN ? '—' : s.pin}
                sub={labelFor(s.pin)}
                count={s.count}
                on={s.pin === value}
                solid={solid}
                onClick={() => choose(s.pin)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
