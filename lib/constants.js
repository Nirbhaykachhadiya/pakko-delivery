// ============================================================================
//  Orders before this date are ignored everywhere - not synced, not shown.
// ============================================================================
export const ORDER_CUTOFF = '2026-09-09';

export const CANCEL_REASONS = [
  'Customer not available / Not picking call',
  'Wrong or incomplete address',
  'Customer refused / Changed mind',
  'Out of delivery area',
  'Other',
];

export const PAYMENT_MODES = [
  { key: 'cash', label: 'Cash' },
  { key: 'online', label: 'Online' },
];

export const STATUSES = {
  pending: {
    label: 'Not assigned',
    chip: 'bg-brand-100 text-brand-900 ring-brand-300',
  },
  out_for_delivery: {
    label: 'Assigned',
    chip: 'bg-brand-600 text-white ring-brand-700',
  },
  rescheduled: {
    label: 'Pending',
    chip: 'bg-warn-100 text-warn-900 ring-warn-500',
  },
  delivered: {
    label: 'Delivered',
    chip: 'bg-good-100 text-good-900 ring-good-500',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-stop-100 text-stop-900 ring-stop-500',
  },
};

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

export const fmtDayFull = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : '';

export function telHref(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) return `tel:${s}`;
  s = s.replace(/^0+/, '');
  if (s.length === 10) return `tel:+91${s}`;
  if (s.length === 12 && s.startsWith('91')) return `tel:+${s}`;
  return `tel:${s}`;
}

export function plainPhone(raw) {
  if (!raw) return '';
  return String(raw).replace(/[^\d]/g, '').replace(/^91/, '').replace(/^0+/, '');
}

export function prettyPhone(raw) {
  const s = plainPhone(raw);
  return s.length === 10 ? `${s.slice(0, 5)} ${s.slice(5)}` : String(raw || '');
}

export const isoDay = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
