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
} from '@/lib/constants';
import { areaFor, normalisePin } from '@/lib/pincodes';

const TABS = [
  { key: 'todo', label: 'To deliver', status: 'out_for_delivery' },
  { key: 'rescheduled', label: 'Pending', status: 'rescheduled' },
  { key: 'delivered', label: 'Delivered', status: 'delivered' },
  { key: 'cancelled', label: 'Cancelled', status: 'cancelled' },
];

const iso = (d) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};

const lastDays = (n) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  });

export default function DeliveryDashboard({ user }) {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [tab, setTab] = useState('todo');
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, u] = await Promise.all([
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]);
    setOrders(o.orders || []);
    setRiders((u.riders || []).filter((r) => r.id !== user.id));
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function setStatus(orderId, status, extra = {}) {
    setBusyId(orderId);
    const res = await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status, ...extra }),
    });
    const d = await res.json();
    setBusyId(null);
    if (!res.ok) return setToast(d.error || 'Could not save');
    setSheet(null);
    setToast(
      status === 'delivered'
        ? `Delivered · ${extra.paymentMode === 'cash' ? 'Cash' : 'Online'}`
        : status === 'cancelled'
          ? 'Marked cancelled'
          : status === 'rescheduled'
            ? 'Moved to Pending'
            : 'Back in To deliver'
    );
    load();
  }

  async function handover(orderId, riderId, riderName) {
    setBusyId(orderId);
    const res = await fetch('/api/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [orderId], riderId }),
    });
    const d = await res.json();
    setBusyId(null);
    if (!res.ok) return setToast(d.error || 'Could not pass it on');
    setSheet(null);
    setToast(`Given to ${riderName}`);
    load();
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

  const inTab = (o, key) => o.status === TABS.find((t) => t.key === key).status;

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach((t) => {
      c[t.key] = orders.filter(
        (o) => inTab(o, t.key) && (!day || iso(stampFor(o, t.key)) === day)
      ).length;
    });
    return c;
  }, [orders, day]);

  const shown = orders
    .filter((o) => inTab(o, tab))
    .filter((o) => !day || iso(stampFor(o, tab)) === day)
    .sort((a, b) =>
      tab === 'rescheduled'
        ? new Date(a.pendingUntil || a.orderDate) - new Date(b.pendingUntil || b.orderDate)
        : new Date(stampFor(b, tab)) - new Date(stampFor(a, tab))
    );

  return (
    <main className="min-h-dvh bg-ink-50 pb-10">
      <header className="sticky top-0 z-20 bg-brand-600 text-white shadow-lg shadow-ink-900/20">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-200 text-sm font-bold text-brand-900">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{user.name}</div>
            <div className="text-xs text-brand-100">
              {day ? fmtDate(day) : 'All days'} · {shown.length} orders
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setSheet({ mode: 'account' })}
              className="rounded-lg px-2 py-1.5 text-sm text-brand-100 active:bg-brand-700"
            >
              Account
            </button>
            <button
              onClick={logout}
              className="rounded-lg px-2 py-1.5 text-sm text-brand-100 active:bg-brand-700"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="no-bar flex items-center gap-2 overflow-x-auto px-4 pb-3">
          <button
            onClick={() => setDay(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
              day === null ? 'bg-brand-200 text-brand-900' : 'bg-brand-700 text-brand-100'
            }`}
          >
            All
          </button>
          {lastDays(10).map((d, i) => {
            const key = iso(d);
            return (
              <button
                key={key}
                onClick={() => setDay(key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  day === key ? 'bg-brand-200 text-brand-900' : 'bg-brand-700 text-brand-100'
                }`}
              >
                {i === 0 ? 'Today' : i === 1 ? 'Yesterday' : fmtDate(d)}
              </button>
            );
          })}
          <input
            type="date"
            value={day || ''}
            onChange={(e) => setDay(e.target.value || null)}
            className="date-dark shrink-0 rounded-full bg-brand-700 px-3 py-1.5 text-sm text-brand-100"
          />
        </div>

        <div className="grid grid-cols-4 border-t border-brand-500">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-[3px] px-1 py-2.5 text-center ${
                tab === t.key
                  ? 'border-brand-600 text-white'
                  : 'border-transparent text-brand-200'
              }`}
            >
              <div className="text-lg font-bold leading-tight tabular-nums">{counts[t.key]}</div>
              <div className="text-[11px] leading-tight">{t.label}</div>
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-3 p-3">
        {loading && <p className="py-16 text-center text-ink-400">Loading…</p>}

        {!loading && shown.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-ink-500">
              {tab === 'todo'
                ? 'Nothing to deliver here.'
                : `No ${TABS.find((t) => t.key === tab).label.toLowerCase()} orders here.`}
            </p>
            {day && (
              <button
                onClick={() => setDay(null)}
                className="mt-2 text-sm font-semibold text-brand-700 underline"
              >
                Show all days
              </button>
            )}
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
      {sheet?.mode === 'account' && (
        <AccountSheet user={user} onClose={() => setSheet(null)} onDone={setToast} />
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
  const pin = normalisePin(o.pincode);
  const area = areaFor(o.pincode);
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
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-200">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5">
        <span className="font-mono text-lg font-bold tracking-tight text-ink-900">
          {o.orderNumber}
        </span>
        {o.source === 'manual' && (
          <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-800">
            MANUAL
          </span>
        )}
        <span className="text-xs text-ink-400">{fmtDateTime(o.orderDate)}</span>
        <span className="ml-auto text-lg font-bold tabular-nums text-ink-900">
          ₹{o.totalPrice}
        </span>
      </div>

      <div className="p-4">
        <div className="text-xl font-semibold leading-tight text-ink-900">{o.customerName}</div>

        {o.assignedByName && (
          <p className="mt-1 text-xs text-ink-400">
            Given by {o.assignedByName}
            {o.assignedByRole === 'admin' ? ' (admin)' : ''}
          </p>
        )}

        <div
          className={`mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1 ${
            area ? 'bg-brand-50 ring-brand-200' : 'bg-ink-100 ring-ink-300'
          }`}
        >
          <span className="font-mono text-sm font-bold tabular-nums text-brand-900">
            {pin || '—'}
          </span>
          <span className="text-brand-300">|</span>
          <span className="text-sm font-semibold text-brand-900">{area || 'Add area name'}</span>
        </div>

        <p className="mt-2.5 leading-relaxed text-ink-700">{o.address}</p>

        {o.phone && (
          <button
            onClick={copyPhone}
            className="mt-1 font-mono text-sm tabular-nums text-ink-400 underline decoration-dotted"
          >
            {prettyPhone(o.phone)} · copy
          </button>
        )}

        <ul className="mt-3 divide-y divide-ink-100 rounded-xl bg-ink-50 ring-1 ring-ink-200">
          {(o.products || []).map((p, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1 font-medium text-ink-900">{p.name}</span>
              <span className="shrink-0 rounded-md bg-ink-900 px-2 py-0.5 text-sm font-bold tabular-nums text-white">
                ×{p.qty}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-700">₹{p.price}</span>
            </li>
          ))}
        </ul>

        {o.status === 'rescheduled' && (
          <div className="mt-3 rounded-xl bg-warn-200 px-3 py-2.5 ring-1 ring-brand-300">
            <div className="text-sm font-bold text-brand-800">
              {o.pendingUntil ? `Customer asked for ${fmtDate(o.pendingUntil)}` : 'Pending'}
              {o.attemptCount > 1 && ` · attempt ${o.attemptCount}`}
            </div>
            <p className="mt-0.5 text-sm text-ink-700">{o.pendingNote}</p>
          </div>
        )}

        {o.status === 'delivered' && (
          <p className="mt-3 font-bold text-good-600">
            Delivered {fmtDateTime(o.deliveredAt)}
            {o.paymentMode && ` · ${o.paymentMode === 'cash' ? 'Cash' : 'Online'}`}
          </p>
        )}

        {o.status === 'cancelled' && (
          <div className="mt-3 rounded-xl bg-ink-100 px-3 py-2.5 ring-1 ring-ink-300">
            <div className="text-sm font-bold text-ink-900">
              Cancelled {fmtDateTime(o.cancelledAt)}
            </div>
            <p className="mt-0.5 text-sm text-ink-700">{o.cancelReason}</p>
            {o.cancelNote && <p className="text-sm text-ink-600">{o.cancelNote}</p>}
          </div>
        )}

        {open ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={onDeliver}
                disabled={busy}
                className="rounded-xl bg-good-500 py-3.5 text-sm font-bold text-white active:bg-good-600 disabled:opacity-60"
              >
                {busy ? <span className="pk-spinner" /> : null}
                Delivered
              </button>
              <button
                onClick={onPending}
                disabled={busy}
                className="rounded-xl bg-warn-500 py-3.5 text-sm font-bold text-brand-900 ring-1 ring-brand-300 disabled:opacity-60"
              >
                Pending
              </button>
              <button
                onClick={onCancel}
                disabled={busy}
                className="rounded-xl bg-stop-500 py-3.5 text-sm font-bold text-white active:bg-stop-600 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {tel ? (
                <a
                  href={tel}
                  role="button"
                  className="flex items-center justify-center rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white active:bg-ink-700"
                >
                  Call
                </a>
              ) : (
                <div className="flex items-center justify-center rounded-xl bg-ink-100 py-3 text-sm text-ink-400">
                  No phone
                </div>
              )}
              <button
                onClick={onGive}
                className="rounded-xl border-2 border-brand-600 py-3 text-sm font-bold text-brand-700 active:bg-brand-50"
              >
                Give to…
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {tel ? (
              <a
                href={tel}
                role="button"
                className="flex items-center justify-center rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white"
              >
                Call
              </a>
            ) : (
              <div className="flex items-center justify-center rounded-xl bg-ink-100 py-3 text-sm text-ink-400">
                No phone
              </div>
            )}
            <button
              onClick={onUndo}
              className="rounded-xl border border-ink-300 py-3 text-sm font-semibold text-ink-700"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function Sheet({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink-950/60" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-200" />
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>
        {children}
      </div>
    </div>
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
              className="flex w-full items-center gap-3 rounded-xl border border-ink-200 px-4 py-3.5 text-left active:bg-ink-50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">
                {r.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-medium text-ink-900">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-5 w-full rounded-xl border border-ink-300 py-3.5 font-medium text-ink-700"
      >
        Go back
      </button>
    </Sheet>
  );
}

function DeliverSheet({ order, onClose, onConfirm }) {
  const [mode, setMode] = useState('');
  return (
    <Sheet
      title="How did the customer pay?"
      subtitle={`${order.customerName} · ${order.orderNumber} · ₹${order.totalPrice}`}
      onClose={onClose}
    >
      <div className="mt-4 grid grid-cols-2 gap-3">
        {PAYMENT_MODES.map((p) => (
          <button
            key={p.key}
            onClick={() => setMode(p.key)}
            className={`rounded-2xl border-2 py-7 text-lg font-semibold ${
              mode === p.key
                ? 'border-good-500 bg-good-50 text-good-600'
                : 'border-ink-200 text-ink-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-ink-300 py-3.5 font-medium text-ink-700"
        >
          Go back
        </button>
        <button
          onClick={() => onConfirm(mode)}
          disabled={!mode}
          className="flex-1 rounded-xl bg-good-500 py-3.5 font-semibold text-white disabled:opacity-40"
        >
          Submit
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
            className="rounded-full bg-ink-100 px-3 py-1.5 text-sm text-ink-700 active:bg-ink-200"
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
        className="mt-3 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-ink-900"
      />
      <label className="mt-3 block">
        <span className="text-sm font-medium text-ink-700">Deliver on (optional)</span>
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-ink-900"
        />
      </label>
      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-ink-300 py-3.5 font-medium text-ink-700"
        >
          Go back
        </button>
        <button
          onClick={() => onConfirm(note, until)}
          disabled={!note.trim()}
          className="flex-1 rounded-xl bg-warn-500 py-3.5 font-bold text-brand-900 ring-1 ring-brand-300 disabled:opacity-40"
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
              reason === r ? 'border-ink-900 bg-ink-50' : 'border-ink-200'
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
            <span className="text-ink-900">{r}</span>
          </label>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={needsNote ? 'Type the reason' : 'Anything to add? (optional)'}
        className="mt-3 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-ink-900"
      />
      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-ink-300 py-3.5 font-medium text-ink-700"
        >
          Go back
        </button>
        <button
          onClick={() => onConfirm(reason, note.trim())}
          disabled={!canSend}
          className="flex-1 rounded-xl bg-stop-500 py-3.5 font-semibold text-white disabled:opacity-40"
        >
          Mark cancelled
        </button>
      </div>
    </Sheet>
  );
}

function AccountSheet({ user, onClose, onDone }) {
  const [currentPassword, setCurrent] = useState('');
  const [newPhone, setPhone] = useState('');
  const [newPassword, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setErr('');
    const res = await fetch('/api/auth/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPhone, newPassword }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(d.error || 'Could not save');
    onClose();
    onDone('Account updated');
  }

  return (
    <Sheet title="My account" subtitle={user.name} onClose={onClose}>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-ink-700">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink-700">New phone number (optional)</span>
          <input
            inputMode="numeric"
            value={newPhone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Leave blank to keep the same"
            className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink-700">New password (optional)</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Leave blank to keep the same"
            className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
          />
        </label>

        {err && <p className="rounded-lg bg-ink-100 px-3 py-2 text-sm text-ink-900">{err}</p>}

        <button
          onClick={save}
          disabled={busy || !currentPassword}
          className="w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? <span className="pk-spinner" /> : null}
          {busy ? 'Saving' : 'Save changes'}
        </button>
      </div>
    </Sheet>
  );
}
