'use client';

import { useState } from 'react';
import { fmtDayFull, isoDay } from '@/lib/constants';

const shift = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDay(d);
};

const PRESETS = [
  { key: 'all', label: 'All', range: () => ({ from: '', to: '' }) },
  { key: 'today', label: 'Today', range: () => ({ from: shift(0), to: shift(0) }) },
  { key: 'yest', label: 'Yesterday', range: () => ({ from: shift(-1), to: shift(-1) }) },
  { key: 'd7', label: 'Last 7 days', range: () => ({ from: shift(-6), to: shift(0) }) },
  { key: 'd30', label: 'Last 30 days', range: () => ({ from: shift(-29), to: shift(0) }) },
];

/**
 * Tap a preset for a quick answer, or open Custom to pick one day or a range.
 * Picking only "From" filters to that single day until a "To" is added.
 */
export default function DateRange({ value, onChange, dark = false }) {
  const [custom, setCustom] = useState(false);

  const activeKey = (() => {
    if (!value.from && !value.to) return 'all';
    for (const p of PRESETS) {
      const r = p.range();
      if (r.from === value.from && r.to === value.to) return p.key;
    }
    return 'custom';
  })();

  const chip = (on) =>
    dark
      ? on
        ? 'bg-brand-200 text-brand-900'
        : 'bg-brand-700 text-brand-100'
      : on
        ? 'bg-brand-600 text-white'
        : 'bg-brand-50 text-brand-800 ring-1 ring-brand-200';

  const label =
    !value.from && !value.to
      ? 'All dates'
      : value.from && value.to && value.from === value.to
        ? fmtDayFull(value.from)
        : `${value.from ? fmtDayFull(value.from) : 'Start'} → ${
            value.to ? fmtDayFull(value.to) : 'Today'
          }`;

  return (
    <div className="space-y-2">
      <div className="no-bar flex items-center gap-2 overflow-x-auto pb-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              onChange(p.range());
              setCustom(false);
            }}
            className={`btn shrink-0 px-3.5 py-2 text-sm ${chip(activeKey === p.key)}`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustom((c) => !c)}
          className={`btn shrink-0 px-3.5 py-2 text-sm ${chip(activeKey === 'custom' || custom)}`}
        >
          Pick dates
        </button>
      </div>

      {/* Always show what is actually selected, so nothing is hidden behind a
          cramped native date box on a small screen */}
      <p className={`text-sm font-semibold ${dark ? 'text-brand-100' : 'text-brand-800'}`}>
        {label}
      </p>

      {(custom || activeKey === 'custom') && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={`text-xs font-medium ${dark ? 'text-brand-200' : 'text-ink-600'}`}>
              From
            </span>
            <input
              type="date"
              value={value.from}
              max={value.to || undefined}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className={`mt-1 rounded-xl px-3 py-2.5 text-sm outline-none ${
                dark
                  ? 'date-dark border border-brand-500 bg-brand-700 text-white'
                  : 'border border-ink-300 bg-white'
              }`}
            />
          </label>
          <label className="block">
            <span className={`text-xs font-medium ${dark ? 'text-brand-200' : 'text-ink-600'}`}>
              To <span className="opacity-70">(blank = same day)</span>
            </span>
            <input
              type="date"
              value={value.to}
              min={value.from || undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className={`mt-1 rounded-xl px-3 py-2.5 text-sm outline-none ${
                dark
                  ? 'date-dark border border-brand-500 bg-brand-700 text-white'
                  : 'border border-ink-300 bg-white'
              }`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
