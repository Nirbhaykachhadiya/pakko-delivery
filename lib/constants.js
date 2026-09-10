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

// Four-colour palette, so status is told apart by fill weight rather than hue:
//   not assigned   light blue fill
//   to deliver     white with blue outline
//   pending        light blue fill, blue outline
//   delivered      solid deep blue
//   cancelled      solid black
export const STATUSES = {
  pending: {
    label: 'Not assigned',
    chip: 'bg-brand-100 text-brand-900 ring-brand-300',
  },
  out_for_delivery: {
    label: 'To deliver',
    chip: 'bg-white text-brand-800 ring-brand-400',
  },
  rescheduled: {
    label: 'Pending',
    chip: 'bg-brand-200 text-brand-900 ring-brand-400',
  },
  delivered: {
    label: 'Delivered',
    chip: 'bg-brand-600 text-white ring-brand-700',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-black text-white ring-black',
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
