'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CANCEL_REASONS,
  PAYMENT_MODES,
  fmtDateTime,
  fmtDate,
  telHref,
  prettyPhone,
  plainPhone,
  isoDay,
} from '@/lib/constants';
import { pinOf, pincodeStats } from '@/lib/pincodes';
import { orderHasProduct } from '@/lib/products';
import PincodeBadge from '@/components/PincodeBadge';
import PincodeFilter from '@/components/PincodeFilter';
import DateRange from '@/components/DateRange';
import { VoicePlayer } from '@/components/VoiceNote';
import ProductSummary from '@/components/ProductSummary';

const TAB_TONE = {
  todo: 'blue',
  rescheduled: 'yellow',
  delivered: 'green',
  cancelled: 'red',
};

const TABS = [
  { key: 'todo', label: 'Assigned', status: 'out_for_delivery' },
  { key: 'rescheduled', label: 'Pending', status: 'rescheduled' },
  { key: 'delivered', label: 'Delivered', status: 'delivered' },
  { key: 'cancelled', label: 'Cancelled', status: 'cancelled' },
];

// A failed route can return an empty body, so never call .json() blindly
async function safeJson(url, init) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!text) return { error: `Empty reply from ${url} (${res.status})` };
    try {
      return JSON.parse(text);
    } catch {
      return { error: `Bad reply from ${url} (${res.status})` };
    }
  } catch (e) {
    return { error: e.message };
  }
}

export default function DeliveryDashboard({ user }) {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [tab, setTab] = useState('todo');
  const [pin, setPin] = useState('');
  const [item, setItem] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [newCount, setNewCount] = useState(0);

  const sigRef = useRef(null);
  const idsRef = useRef(new Set());
  const pausedRef = useRef(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      const [o, u] = await Promise.all([
        safeJson('/api/orders'),
        safeJson('/api/users'),
      ]);
      if (o.error) setToast(o.error);
      const list = o.orders || [];

      // Anything newly landed in "Assigned" that this rider has not seen yet
      const liveIds = new Set(
        list.filter((x) => x.status === 'out_for_delivery').map((x) => x.id)
      );
      if (idsRef.current.size) {
        const fresh = [...liveIds].filter((id) => !idsRef.current.has(id)).length;
        if (fresh > 0 && quiet) {
          setNewCount((n) => n + fresh);
          const anyUrgent = list.some(
            (x) => x.isUrgent && liveIds.has(x.id) && !idsRef.current.has(x.id)
          );
          try {
            // a longer buzz when one of them is urgent
            navigator.vibrate?.(anyUrgent ? [250, 100, 250, 100, 250] : [120, 60, 120]);
          } catch {}
        }
      }
      idsRef.current = liveIds;

      setOrders(list);
      setRiders((u.riders || []).filter((r) => r.id !== user.id));
      if (!quiet) setLoading(false);
    },
    [user.id]
  );

  // Ask the server only for a tiny fingerprint. The full list is fetched
  // just when that fingerprint changes, so checking often stays cheap.
  const checkForChanges = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const v = await safeJson('/api/orders/version');
      if (v.error) return;
      const sig = `${v.count}:${v.latest}`;
      if (sigRef.current === null) {
        sigRef.current = sig;
        return;
      }
      if (sig !== sigRef.current) {
        sigRef.current = sig;
        await load(true);
      }
    } catch {
      // offline or a dropped signal - try again on the next tick
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the app is actually on screen; stop the moment it is not,
  // and catch up instantly when the rider looks at it again.
  useEffect(() => {
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') checkForChanges();
    }, 20000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForChanges();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);

    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [checkForChanges]);

  // While a sheet is open the rider is mid-task, so hold refreshes back
  useEffect(() => {
    pausedRef.current = Boolean(sheet);
  }, [sheet]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function setStatus(orderId, status, extra = {}) {
    const before = orders;
    const now = new Date().toISOString();

    // Move the card straight away - a rider on mobile data should not wait
    setOrders((cur) =>
      cur.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              deliveredAt: status === 'delivered' ? o.deliveredAt || now : null,
              paymentMode: status === 'delivered' ? extra.paymentMode : null,
              cancelledAt: status === 'cancelled' ? now : null,
              cancelReason: status === 'cancelled' ? extra.cancelReason : null,
              cancelNote: status === 'cancelled' ? extra.cancelNote : null,
              pendingNote: status === 'rescheduled' ? extra.pendingNote : null,
              pendingUntil: status === 'rescheduled' ? extra.pendingUntil || null : null,
              lastAttemptAt:
                status === 'rescheduled' || status === 'cancelled' ? now : o.lastAttemptAt,
            }
          : o
      )
    );
    setSheet(null);
    setToast(
      status === 'delivered'
        ? `Delivered · ${extra.paymentMode === 'cash' ? 'Cash' : 'Online'}`
        : status === 'cancelled'
          ? 'Marked cancelled'
          : status === 'rescheduled'
            ? 'Moved to Pending'
            : 'Back in Assigned'
    );

    const res = await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status, ...extra }),
    });

    if (!res.ok) {
      const err = await res.json();
      setOrders(before);
      setToast(err.error || 'Could not save - try again');
    }
    sigRef.current = null;
  }

  async function handover(orderId, riderId, riderName) {
    const before = orders;
    setOrders((cur) => cur.filter((o) => o.id !== orderId));
    setSheet(null);
    setToast(`Given to ${riderName}`);

    const res = await fetch('/api/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [orderId], riderId }),
    });

    if (!res.ok) {
      const err = await res.json();
      setOrders(before);
      setToast(err.error || 'Could not pass it on');
    }
    sigRef.current = null;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const stampFor = (o, key) =>
    key === 'delivered'
      ? o.deliveredAt
      : key === 'cancelled'
        ? o.cancelledAt
        : key === 'rescheduled'
          ? o.lastAttemptAt
          : o.orderDate;

  const inRange = (o, key) => {
    if (!range.from && !range.to) return true;
    const day = isoDay(stampFor(o, key));
    const from = range.from || '0000-00-00';
    const to = range.to || range.from;
    return day >= from && day <= to;
  };

  const inTab = (o, key) => o.status === TABS.find((t) => t.key === key).status;

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach((t) => {
      c[t.key] = orders.filter((o) => inTab(o, t.key) && inRange(o, t.key)).length;
    });
    return c;
  }, [orders, range]);

  useEffect(() => {
    if (tab === 'todo' && newCount > 0) {
      const t = setTimeout(() => setNewCount(0), 4000);
      return () => clearTimeout(t);
    }
  }, [tab, newCount]);

  const inThisTab = useMemo(
    () => orders.filter((o) => inTab(o, tab) && inRange(o, tab)),
    [orders, tab, range]
  );

  // Laid out the way the rider should ride it - busiest area first, then
  // whichever is nearest. A refresh re-runs it, so the run stays sensible.
  const pinStats = useMemo(() => pincodeStats(inThisTab), [inThisTab]);

  // An area the rider finished drops out of the list, so fall back to showing
  // everything. Worked out while rendering rather than corrected afterwards,
  // so there is never a frame showing an empty list.
  const livePin = pinStats.some((s) => s.pin === pin) ? pin : '';

  // The item chips describe the chosen area, so a rider can pick an area and
  // then an item within it, and still switch items without losing the area.
  const inThisArea = useMemo(
    () => inThisTab.filter((o) => !livePin || pinOf(o) === livePin),
    [inThisTab, livePin]
  );

  const shown = useMemo(() => {
    const rank = new Map(pinStats.map((s, i) => [s.pin, i]));

    return inThisArea
      .filter((o) => !item || orderHasProduct(o, item))
      .sort((a, b) => {
        // anything marked urgent comes first, whatever the tab
        if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;

        // then keep each area together, in map order
        const ra = rank.get(pinOf(a)) ?? Infinity;
        const rb = rank.get(pinOf(b)) ?? Infinity;
        if (ra !== rb) return ra - rb;

        if (tab === 'rescheduled') {
          return new Date(a.pendingUntil || a.orderDate) - new Date(b.pendingUntil || b.orderDate);
        }
        return new Date(stampFor(b, tab)) - new Date(stampFor(a, tab));
      });
  }, [inThisArea, pinStats, item, tab]);

  return (
    <main className="min-h-dvh bg-white pb-10">
      <header className="sticky top-0 z-20 bg-brand-600 text-white shadow-lg shadow-brand-900/20">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-200 text-sm font-bold text-brand-900">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="text-xs text-brand-100">{shown.length} orders showing</div>
          </div>
          <button
            onClick={logout}
            className="btn btn-plain ml-auto px-2.5 py-2 text-sm text-brand-100"
          >
            Sign out
          </button>
        </div>

        <div className="px-4 pb-3">
          <DateRange value={range} onChange={setRange} dark />
        </div>

        <div className="grid grid-cols-4 border-t border-brand-500">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPin('');
                setItem('');
              }}
              className={`border-b-[3px] px-1 py-2.5 text-center ${
                tab === t.key
                  ? 'border-brand-200 text-white'
                  : 'border-transparent text-brand-200'
              }`}
            >
              <div className="text-lg font-bold leading-tight tabular-nums">{counts[t.key]}</div>
              <div className="text-[11px] leading-tight">{t.label}</div>
            </button>
          ))}
        </div>
      </header>

      {!loading && (
        <div className="space-y-3 px-3 pt-3">
          <PincodeFilter
            stats={pinStats}
            value={livePin}
            onChange={(p) => {
              setPin(p);
              setItem('');
            }}
            tone={TAB_TONE[tab]}
          />
          <ProductSummary
            orders={inThisArea}
            tone={TAB_TONE[tab]}
            value={item}
            onChange={setItem}
          />
        </div>
      )}

      {newCount > 0 && (
        <button
          onClick={() => {
            setNewCount(0);
            setTab('todo');
            setPin('');
            setItem('');
            setRange({ from: '', to: '' });
          }}
          className="btn btn-light sticky top-[150px] z-20 mx-3 mt-3 w-[calc(100%-1.5rem)] py-3 shadow-lg"
        >
          {newCount} new {newCount === 1 ? 'order' : 'orders'} for you · tap to see
        </button>
      )}

      <div className="space-y-3 p-3">
        {loading && <p className="py-16 text-center text-ink-400">Loading…</p>}

        {!loading && shown.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-ink-500">
              {item
                ? 'No orders with that item here.'
                : livePin
                  ? `Nothing left in ${livePin === 'unknown' ? 'orders without a pincode' : livePin}.`
                  : tab === 'todo'
                    ? 'Nothing assigned to you here.'
                    : `No ${TABS.find((t) => t.key === tab).label.toLowerCase()} orders here.`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {item && (
                <button onClick={() => setItem('')} className="btn btn-ghost px-4 py-2 text-sm">
                  Show all items
                </button>
              )}
              {livePin && (
                <button onClick={() => setPin('')} className="btn btn-ghost px-4 py-2 text-sm">
                  Show all areas
                </button>
              )}
              {(range.from || range.to) && (
                <button
                  onClick={() => setRange({ from: '', to: '' })}
                  className="btn btn-ghost px-4 py-2 text-sm"
                >
                  Show all dates
                </button>
              )}
            </div>
          </div>
        )}

        {!loading &&
          shown.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              tab={tab}
              busy={busyId === o.id}
              onCopy={setToast}
              onDeliver={() => setSheet({ mode: 'deliver', order: o })}
              onPending={() => setSheet({ mode: 'pending', order: o })}
              onCancel={() => setSheet({ mode: 'cancel', order: o })}
              onGive={() => setSheet({ mode: 'give', order: o })}
              onUndo={() => setStatus(o.id, 'out_for_delivery')}
            />
          ))}
      </div>

      {sheet?.mode === 'deliver' && (
        <DeliverSheet
          order={sheet.order}
          onClose={() => setSheet(null)}
          onConfirm={(paymentMode) => setStatus(sheet.order.id, 'delivered', { paymentMode })}
        />
      )}
      {sheet?.mode === 'cancel' && (
        <CancelSheet
          order={sheet.order}
          onClose={() => setSheet(null)}
          onConfirm={(cancelReason, cancelNote) =>
            setStatus(sheet.order.id, 'cancelled', { cancelReason, cancelNote })
          }
        />
      )}
      {sheet?.mode === 'pending' && (
        <PendingSheet
          order={sheet.order}
          onClose={() => setSheet(null)}
          onConfirm={(pendingNote, pendingUntil) =>
            setStatus(sheet.order.id, 'rescheduled', { pendingNote, pendingUntil })
          }
        />
      )}
      {sheet?.mode === 'give' && (
        <GiveSheet
          order={sheet.order}
          riders={riders}
          onClose={() => setSheet(null)}
          onConfirm={(id, name) => handover(sheet.order.id, id, name)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-5 z-50 rounded-xl bg-brand-900 px-4 py-3 text-center font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function OrderCard({ order: o, tab, busy, onDeliver, onPending, onCancel, onGive, onUndo, onCopy }) {
  const tel = telHref(o.phone);
  const open = tab === 'todo' || tab === 'rescheduled';

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(plainPhone(o.phone));
      onCopy('Number copied');
    } catch {
      onCopy(plainPhone(o.phone));
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-md ${
        o.isUrgent
          ? 'shadow-stop-500/20 ring-2 ring-stop-500'
          : 'shadow-brand-900/5 ring-1 ring-ink-200'
      }`}
    >
      {o.isUrgent && (
        <div className="bg-stop-500 px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white">
            <span aria-hidden>🔴</span> Urgent
            {o.urgentBy && (
              <span className="ml-auto text-xs font-medium normal-case opacity-90">
                from {o.urgentBy}
              </span>
            )}
          </div>
          {o.urgentNote && (
            <p className="mt-1 text-[15px] font-semibold leading-snug text-white">
              {o.urgentNote}
            </p>
          )}
          {o.voiceNote && (
            <div className="mt-2 rounded-xl bg-white p-2.5">
              <VoicePlayer src={o.voiceNote} seconds={o.voiceNoteSec} tone="red" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <span className="font-mono text-lg font-bold tracking-tight text-black">
          {o.orderNumber}
        </span>
        {o.source === 'manual' && (
          <span className="rounded bg-brand-200 px-1.5 py-0.5 text-[11px] font-bold text-brand-900">
            MANUAL
          </span>
        )}
        <span className="text-xs text-ink-400">{fmtDateTime(o.orderDate)}</span>
        <span className="ml-auto text-lg font-bold tabular-nums text-black">
          ₹{o.totalPrice}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-semibold leading-tight text-black">
              {o.customerName}
            </div>
            {o.assignedByName && (
              <p className="mt-0.5 text-xs text-ink-400">
                Given by {o.assignedByName}
                {o.assignedByRole === 'admin' ? ' (admin)' : ''}
              </p>
            )}
          </div>
          <PincodeBadge pincode={o.pincode} />
        </div>

        <p className="mt-3 leading-relaxed text-ink-700">{o.address}</p>

        {o.phone && (
          <button
            onClick={copyPhone}
            className="mt-1 font-mono text-sm tabular-nums text-ink-500 underline decoration-dotted"
          >
            {prettyPhone(o.phone)} · copy
          </button>
        )}

        <ul className="mt-3 divide-y divide-ink-100 rounded-xl bg-ink-50 ring-1 ring-ink-200">
          {(o.products || []).map((p, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 font-medium text-black">{p.name}</span>
              <span className="shrink-0 rounded-md bg-black px-2 py-0.5 text-sm font-bold tabular-nums text-white">
                ×{p.qty}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-700">₹{p.price}</span>
            </li>
          ))}
        </ul>

        {o.status === 'rescheduled' && (
          <div className="mt-3 rounded-xl bg-warn-50 px-3 py-2.5 ring-1 ring-warn-500">
            <div className="text-sm font-bold text-warn-900">
              {o.pendingUntil ? `Customer asked for ${fmtDate(o.pendingUntil)}` : 'Pending'}
              {o.attemptCount > 1 && ` · attempt ${o.attemptCount}`}
            </div>
            <p className="mt-0.5 text-sm text-ink-700">{o.pendingNote}</p>
          </div>
        )}

        {o.status === 'delivered' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-good-50 px-3 py-2.5 ring-1 ring-good-500">
            <span className="text-sm font-bold text-good-900">
              Delivered {fmtDateTime(o.deliveredAt)}
            </span>
            <span className="rounded-md bg-good-500 px-2 py-0.5 text-sm font-bold text-white">
              {o.paymentMode === 'cash' ? 'Cash' : 'Online'}
            </span>
            <button
              onClick={onDeliver}
              className="btn btn-ghost ml-auto px-3 py-1.5 text-xs"
            >
              Change to {o.paymentMode === 'cash' ? 'Online' : 'Cash'}
            </button>
          </div>
        )}

        {o.status === 'cancelled' && (
          <div className="mt-3 rounded-xl bg-stop-50 px-3 py-2.5 ring-1 ring-stop-500">
            <div className="text-sm font-bold text-stop-900">
              Cancelled {fmtDateTime(o.cancelledAt)}
            </div>
            <p className="mt-0.5 text-sm text-ink-700">{o.cancelReason}</p>
            {o.cancelNote && <p className="text-sm text-ink-600">{o.cancelNote}</p>}
          </div>
        )}

        {/* Actions, in the order they get used */}
        {open ? (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {tel ? (
                <a href={tel} role="button" className="btn btn-blue py-3.5 text-sm">
                  <span aria-hidden>📞</span> Call
                </a>
              ) : (
                <span className="btn bg-ink-100 py-3.5 text-sm text-ink-400">No phone</span>
              )}
              <button
                onClick={onDeliver}
                disabled={busy}
                className="btn btn-green py-3.5 text-sm"
              >
                {busy && <span className="pk-spinner" />} Delivered
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onPending}
                disabled={busy}
                className="btn btn-yellow py-3 text-sm"
              >
                Pending
              </button>
              <button onClick={onCancel} disabled={busy} className="btn btn-red py-3 text-sm">
                Cancel
              </button>
              <button onClick={onGive} disabled={busy} className="btn btn-light py-3 text-sm">
                Give to…
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {tel ? (
              <a href={tel} role="button" className="btn btn-blue py-3.5 text-sm">
                <span aria-hidden>📞</span> Call
              </a>
            ) : (
              <span className="btn bg-ink-100 py-3.5 text-sm text-ink-400">No phone</span>
            )}
            <button onClick={onUndo} disabled={busy} className="btn btn-ghost py-3.5 text-sm">
              {busy && <span className="pk-spinner" />} Undo
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function Sheet({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-200" />
        <h2 className="text-lg font-semibold text-black">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function DeliverSheet({ order, onClose, onConfirm }) {
  const [mode, setMode] = useState(order.paymentMode || '');
  const already = order.status === 'delivered';

  return (
    <Sheet
      title={already ? 'Change payment type' : 'How did the customer pay?'}
      subtitle={`${order.customerName} · ${order.orderNumber} · ₹${order.totalPrice}`}
      onClose={onClose}
    >
      <div className="mt-4 grid grid-cols-2 gap-3">
        {PAYMENT_MODES.map((p) => (
          <button
            key={p.key}
            onClick={() => setMode(p.key)}
            className={`btn border-2 py-7 text-lg ${
              mode === p.key
                ? 'border-good-500 bg-good-50 text-good-900'
                : 'border-ink-200 bg-white text-ink-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="btn btn-ghost flex-1 py-3.5">
          Go back
        </button>
        <button
          onClick={() => onConfirm(mode)}
          disabled={!mode}
          className="btn btn-green flex-1 py-3.5"
        >
          {already ? 'Save' : 'Submit'}
        </button>
      </div>
    </Sheet>
  );
}

function PendingSheet({ order, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [until, setUntil] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const quick = [
    'Customer asked to come tomorrow',
    'Customer not at home, will take later',
    'Asked to deliver after office hours',
    'Customer will confirm the day',
  ];

  return (
    <Sheet
      title="Why is it still pending?"
      subtitle={`${order.customerName} · ${order.orderNumber}`}
      onClose={onClose}
    >
      <div className="mt-4 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => setNote(q)}
            className="btn bg-ink-100 px-3 py-1.5 text-sm font-normal text-ink-700"
          >
            {q}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="What did the customer say?"
        className="mt-3 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
      />
      <label className="mt-3 block">
        <span className="text-sm font-medium text-ink-700">Deliver on (optional)</span>
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="mt-1.5 rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
        />
      </label>
      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="btn btn-ghost flex-1 py-3.5">
          Go back
        </button>
        <button
          onClick={() => onConfirm(note, until)}
          disabled={!note.trim()}
          className="btn btn-yellow flex-1 py-3.5"
        >
          Save as pending
        </button>
      </div>
    </Sheet>
  );
}

function CancelSheet({ order, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const needsNote = reason === 'Other';
  const canSend = reason && (!needsNote || note.trim());

  return (
    <Sheet
      title="Why is this cancelled?"
      subtitle={`${order.customerName} · ${order.orderNumber}`}
      onClose={onClose}
    >
      <div className="mt-4 space-y-2">
        {CANCEL_REASONS.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 ${
              reason === r ? 'border-stop-500 bg-stop-50' : 'border-ink-200'
            }`}
          >
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="size-4"
            />
            <span className="text-black">{r}</span>
          </label>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={needsNote ? 'Type the reason' : 'Anything to add? (optional)'}
        className="mt-3 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
      />
      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="btn btn-ghost flex-1 py-3.5">
          Go back
        </button>
        <button
          onClick={() => onConfirm(reason, note.trim())}
          disabled={!canSend}
          className="btn btn-red flex-1 py-3.5"
        >
          Mark cancelled
        </button>
      </div>
    </Sheet>
  );
}

function GiveSheet({ order, riders, onClose, onConfirm }) {
  return (
    <Sheet
      title="Who is delivering this?"
      subtitle={`${order.customerName} · ${order.orderNumber}`}
      onClose={onClose}
    >
      {riders.length === 0 ? (
        <p className="mt-6 text-center text-ink-500">
          There is no one else to pass this to right now.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {riders.map((r) => (
            <button
              key={r.id}
              onClick={() => onConfirm(r.id, r.name)}
              className="btn btn-ghost w-full justify-start gap-3 px-4 py-3.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-200 text-sm font-bold text-brand-900">
                {r.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-medium text-black">{r.name}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={onClose} className="btn btn-ghost mt-5 w-full py-3.5">
        Go back
      </button>
    </Sheet>
  );
}
