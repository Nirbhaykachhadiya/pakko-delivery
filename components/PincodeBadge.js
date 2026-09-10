'use client';

import { areaFor, normalisePin } from '@/lib/pincodes';

/**
 * The thing an admin's eye lands on when sorting a pile of orders, so it is
 * deliberately the loudest element on the card: big tabular pincode, area
 * name underneath, dark blue block. Unknown pincodes go amber-outlined so a
 * missing area name is impossible to miss.
 *
 * size="lg" for rider cards, "sm" for dense admin tables.
 */
export default function PincodeBadge({ pincode, size = 'lg' }) {
  const pin = normalisePin(pincode);
  const area = areaFor(pincode);

  const big = size === 'lg';

  if (!area) {
    return (
      <div
        className={`inline-flex flex-col rounded-xl border-2 border-dashed border-warn-500 bg-warn-50 ${
          big ? 'px-3.5 py-2' : 'px-2 py-1'
        }`}
      >
        <span
          className={`font-mono font-extrabold tabular-nums leading-none text-warn-900 ${
            big ? 'text-2xl' : 'text-base'
          }`}
        >
          {pin || '—'}
        </span>
        <span
          className={`font-semibold text-warn-900/80 ${big ? 'mt-1 text-sm' : 'text-[11px]'}`}
        >
          Add area name
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col rounded-xl bg-brand-600 ${
        big ? 'px-3.5 py-2' : 'px-2 py-1'
      }`}
    >
      <span
        className={`font-mono font-extrabold tabular-nums leading-none tracking-wide text-white ${
          big ? 'text-2xl' : 'text-base'
        }`}
      >
        {pin}
      </span>
      <span
        className={`font-bold uppercase tracking-wide text-brand-200 ${
          big ? 'mt-1 text-sm' : 'text-[11px]'
        }`}
      >
        {area}
      </span>
    </div>
  );
}
