'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  STATUSES,
  CANCEL_REASONS,
  fmtDateTime,
  fmtDate,
  telHref,
  prettyPhone,
} from '@/lib/constants';
import { areaFor } from '@/lib/pincodes';
import PincodeBadge from '@/components/PincodeBadge';
import DateRange from '@/components/DateRange';

const REFRESH_MS = 25000;

function UserIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.6" fill="currentColor" />
      <path
        d="M4.5 20c0-3.8 3.4-6.2 7.5-6.2s7.5 2.4 7.5 6.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AdminDashboard({ user }) {
  const router = useRouter();

  // who = 'unassigned' or a rider id.  statusPick = null | 'all' | a status
  const [who, setWho] = useState('unassigned');
  const [statusPick, setStatusPick] = useState(null);

  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [flashIds, setFlashIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState('orders');

  const [range, setRange] = useState({ from: '', to: '' });
  const [typedQ, setTypedQ] = useState('');
  const [q, setQ] = useState('');

  const menuRef = useRef(null);
  const onRider = who !== 'unassigned';
  const riderName = riders.find((r) => r.id === Number(who))?.name || '';

  useEffect(() => {
    const t = setTimeout(() => setQ(typedQ), 350);
    return () => clearTimeout(t);
  }, [typedQ]);

  useEffect(() => {
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const orderQuery = useMemo(() => {
    const p = new URLSearchParams();

    if (onRider) {
      p.set('rider', String(who));
      if (statusPick === null) p.set('status', 'out_for_delivery');
      else if (statusPick !== 'all') p.set('status', statusPick);
    } else if (statusPick === null || statusPick === 'pending') {
      p.set('rider', 'unassigned');
    } else if (statusPick !== 'all') {
      p.set('status', statusPick);
    }
    // statusPick 'all' with no rider means every order, so nothing is set

    if (q) p.set('q', q);
    if (range.from) p.set('from', range.from);
    if (range.to) p.set('to', range.to);
    return p.toString();
  }, [who, statusPick, onRider, q, range]);

  const statsQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (range.from) p.set('from', range.from);
    if (range.to) p.set('to', range.to);
    if (onRider) p.set('rider', String(who));
    return p.toString();
  }, [range, onRider, who]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      const [o, s, u] = await Promise.all([
        fetch(`/api/orders?${orderQuery}`).then((x) => x.json()),
        fetch(`/api/stats?${statsQuery}`).then((x) => x.json()),
        fetch('/api/users').then((x) => x.json()),
      ]);
      setOrders(o.orders || []);
      setStats(s);
      setRiders(u.riders || []);
      setTeam(u.all || []);
      if (!quiet) setPicked(new Set());
      setLoading(false);
    },
    [orderQuery, statsQuery]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, REFRESH_MS);
    const onFocus = () => load(true);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  function pickWho(next) {
    setWho(next);
    setStatusPick(null);
    setPicked(new Set());
  }

  async function sync() {
    setSyncing(true);
    const res = await fetch('/api/sync', { method: 'POST' });
    const d = await res.json();
    setSyncing(false);
    setToast(
      res.ok
        ? `Synced in ${((d.ms || 0) / 1000).toFixed(1)}s · ${d.created} new`
        : d.error || 'Sync failed'
    );
    if (res.ok) load(true);
  }

  async function assign(orderIds, riderId) {
    const target = riderId ? riders.find((r) => r.id === Number(riderId)) : null;
    const ids = new Set(orderIds.map(Number));
    const before = orders;

    setOrders((cur) =>
      cur.map((o) =>
        ids.has(o.id)
          ? {
              ...o,
              assignedToId: riderId ? Number(riderId) : null,
              assignedTo: target ? { id: target.id, name: target.name } : null,
              assignedByName: user.name,
              assignedByRole: 'admin',
              status: ['pending', 'out_for_delivery', 'rescheduled'].includes(o.status)
                ? riderId
                  ? 'out_for_delivery'
                  : 'pending'
                : o.status,
            }
          : o
      )
    );
    setFlashIds(new Set(orderIds));
    setTimeout(() => setFlashIds(new Set()), 950);
    setToast(target ? `Given to ${target.name}` : 'Assignment removed');
    setPicked(new Set());

    const res = await fetch('/api/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds, riderId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setOrders(before);
      return setToast(d.error || 'Could not assign');
    }
    load(true);
  }

  async function cancelOrder(orderId, cancelReason, cancelNote) {
    setBusyIds(new Set([orderId]));
    const res = await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: 'cancelled', cancelReason, cancelNote }),
    });
    setBusyIds(new Set());
    const d = await res.json();
    if (!res.ok) return setToast(d.error || 'Could not cancel');
    setModal(null);
    setToast('Order cancelled');
    load(true);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const toggle = (id) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  const listTitle = onRider
    ? statusPick === null
      ? `${riderName} · assigned orders`
      : `${riderName} · ${statusPick === 'all' ? 'all orders' : STATUSES[statusPick]?.label}`
    : statusPick === null || statusPick === 'pending'
      ? 'Not assigned orders'
      : statusPick === 'all'
        ? 'All orders'
        : `${STATUSES[statusPick]?.label} orders`;

  return (
    <main className="min-h-dvh bg-white pb-10">
      <header className="sticky top-0 z-30 bg-brand-600 text-white">
        <div className="mx-auto flex max-w-[1700px] items-center gap-2 px-3 py-2.5 md:px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-200 text-sm font-bold text-brand-900">
            PA
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">Pakko Amdavadi</div>
            <div className="text-xs text-brand-100">Delivery control</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setModal({ type: 'newOrder' })}
              className="btn btn-light px-3 py-2 text-sm"
            >
              + Order
            </button>
            <button onClick={sync} disabled={syncing} className="btn btn-light px-3 py-2 text-sm">
              {syncing && <span className="pk-spinner" />}
              {syncing ? 'Syncing' : 'Sync'}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((m) => !m)}
                aria-label="Menu"
                className="btn grid size-10 place-items-center rounded-full bg-brand-700 text-white"
              >
                <UserIcon className="size-6" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-xl border border-ink-200 bg-white text-black shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
                    <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-700">
                      <UserIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{user.name}</div>
                      <div className="text-xs text-ink-500">Admin</div>
                    </div>
                  </div>
                  <MenuItem
                    onClick={() => {
                      setModal({ type: 'account' });
                      setMenuOpen(false);
                    }}
                  >
                    Admin credentials
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setView('team');
                      setMenuOpen(false);
                    }}
                    active={view === 'team'}
                  >
                    Rider credentials
                  </MenuItem>
                  <MenuItem onClick={logout} danger>
                    Sign out
                  </MenuItem>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {view === 'team' ? (
        <div className="mx-auto max-w-[1700px] p-3 md:p-5">
          <button onClick={() => setView('orders')} className="btn btn-ghost mb-3 px-3 py-2 text-sm">
            ← Back to orders
          </button>
          <TeamPanel
            team={team}
            onAdd={() => setModal({ type: 'newRider' })}
            onEdit={(r) => setModal({ type: 'editRider', rider: r })}
            onToast={setToast}
            reload={load}
          />
        </div>
      ) : (
        <>
          <div className="sticky top-[57px] z-20 border-b border-ink-200 bg-white">
            <div className="no-bar mx-auto flex max-w-[1700px] items-center gap-5 overflow-x-auto px-3 md:px-5">
              <button
                onClick={() => pickWho('unassigned')}
                className={`tab ${!onRider ? 'tab-on' : ''}`}
              >
                Not assigned
                <span className="ml-1 tabular-nums">({stats?.unassigned ?? 0})</span>
              </button>

              {(stats?.riderStats || []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => pickWho(r.id)}
                  className={`tab ${Number(who) === r.id ? 'tab-on' : ''}`}
                >
                  {r.name}
                  <span className="ml-1 tabular-nums">({r.assigned})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[1700px] space-y-4 p-3 md:p-5">
            <section className="rounded-2xl border border-ink-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <input
                  value={typedQ}
                  onChange={(e) => setTypedQ(e.target.value)}
                  placeholder={
                    onRider
                      ? `Search within ${riderName}'s orders`
                      : 'Search name, phone, pincode, order no.'
                  }
                  className="min-w-0 flex-1 rounded-xl border border-ink-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600"
                />
                <button
                  onClick={() => setShowFilters((s) => !s)}
                  className={`btn px-3.5 py-2.5 text-sm ${
                    showFilters || range.from || range.to ? 'btn-blue' : 'btn-ghost'
                  }`}
                >
                  Date filter{range.from || range.to ? ' · on' : ''}
                </button>
                {(range.from || range.to || q) && (
                  <button
                    onClick={() => {
                      setRange({ from: '', to: '' });
                      setTypedQ('');
                    }}
                    className="btn btn-ghost px-3 py-2.5 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="border-t border-ink-100 p-3">
                  <DateRange value={range} onChange={setRange} />
                  <p className="mt-2 text-xs text-ink-500">
                    {onRider
                      ? `Applies to ${riderName} only - the counts below follow it too.`
                      : 'Applies to the counts, the rider table and the list below.'}
                  </p>
                </div>
              )}
            </section>

            {stats && (
              <>
                {onRider && (
                  <p className="text-sm text-ink-500">
                    These numbers are <b className="text-black">{riderName}</b> only
                  </p>
                )}
                <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  <StatButton
                    label="Total"
                    value={stats.total}
                    on={statusPick === 'all'}
                    onClick={() => setStatusPick('all')}
                  />
                  <StatButton
                    label="Not assigned"
                    value={onRider ? stats.counts.pending : stats.unassigned}
                    tone="brand"
                    on={statusPick === null || statusPick === 'pending'}
                    onClick={() => setStatusPick('pending')}
                  />
                  <StatButton
                    label="Assigned"
                    value={stats.counts.out_for_delivery}
                    tone="brand"
                    on={statusPick === 'out_for_delivery'}
                    onClick={() => setStatusPick('out_for_delivery')}
                  />
                  <StatButton
                    label="Pending"
                    value={stats.counts.rescheduled}
                    tone="warn"
                    on={statusPick === 'rescheduled'}
                    onClick={() => setStatusPick('rescheduled')}
                  />
                  <StatButton
                    label="Delivered"
                    value={stats.counts.delivered}
                    tone="good"
                    on={statusPick === 'delivered'}
                    onClick={() => setStatusPick('delivered')}
                  />
                  <StatButton
                    label="Cancelled"
                    value={stats.counts.cancelled}
                    tone="stop"
                    on={statusPick === 'cancelled'}
                    onClick={() => setStatusPick('cancelled')}
                  />
                </section>
              </>
            )}

            {/* The rider comparison table only makes sense when looking at
                everyone, so it is hidden once a single rider is picked */}
            {!onRider && stats?.riderStats?.length > 0 && (
              <section className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="border-b border-ink-100 bg-ink-50 text-left text-ink-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Delivery boy</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      <th className="px-3 py-2.5 text-right font-medium">Assigned</th>
                      <th className="bg-warn-50 px-3 py-2.5 text-right font-semibold text-warn-900">
                        Pending
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">Delivered</th>
                      <th className="px-3 py-2.5 text-right font-medium">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {stats.riderStats.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => pickWho(r.id)}
                        className="cursor-pointer hover:bg-brand-50"
                      >
                        <td className="px-4 py-2.5 font-semibold text-black">{r.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{r.total}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-brand-700">
                          {r.assigned}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-bold tabular-nums ${
                            r.rescheduled > 0
                              ? 'bg-warn-100 text-warn-900'
                              : 'bg-warn-50 text-ink-400'
                          }`}
                        >
                          {r.rescheduled}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-good-600">
                          {r.delivered}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-stop-600">
                          {r.cancelled}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-black">{listTitle}</h2>
              <span className="text-sm text-ink-500 tabular-nums">{orders.length}</span>
              {loading && <span className="pk-spinner text-ink-400" />}
            </div>

            {picked.size > 0 && (
              <div className="sticky top-[100px] z-20 flex flex-wrap items-center gap-2 rounded-xl bg-brand-800 px-3 py-2.5 text-white shadow-lg">
                <span className="text-sm font-medium tabular-nums">{picked.size} selected</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const v = e.target.value;
                    assign([...picked], v === 'unassign' ? null : Number(v));
                    e.target.value = '';
                  }}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-sm text-black"
                >
                  <option value="">Assign to…</option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  <option value="unassign">Remove assignment</option>
                </select>
                <button
                  onClick={() => setPicked(new Set())}
                  className="btn btn-plain ml-auto px-2 py-1 text-sm text-brand-100"
                >
                  Clear
                </button>
              </div>
            )}

            {!loading && orders.length === 0 && (
              <p className="py-14 text-center text-ink-500">Nothing here right now.</p>
            )}

            <div className="space-y-3 md:hidden">
              {orders.map((o) => (
                <AdminOrderCard
                  key={o.id}
                  order={o}
                  riders={riders}
                  picked={picked.has(o.id)}
                  busy={busyIds.has(o.id)}
                  flash={flashIds.has(o.id)}
                  onToggle={() => toggle(o.id)}
                  onAssign={(rid) => assign([o.id], rid)}
                  onCancel={() => setModal({ type: 'cancel', order: o })}
                />
              ))}
            </div>

            {orders.length > 0 && (
              <section className="hidden overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[1250px] text-sm">
                  <thead className="border-b border-ink-100 bg-ink-50 text-left text-ink-500">
                    <tr>
                      <th className="w-10 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={orders.length > 0 && picked.size === orders.length}
                          onChange={(e) =>
                            setPicked(
                              e.target.checked ? new Set(orders.map((o) => o.id)) : new Set()
                            )
                          }
                          className="size-4"
                        />
                      </th>
                      <th className="px-3 py-2.5 font-medium">Order</th>
                      <th className="px-3 py-2.5 font-medium">Area</th>
                      <th className="px-3 py-2.5 font-medium">Customer</th>
                      <th className="px-3 py-2.5 font-medium">Items</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <th className="px-3 py-2.5 font-medium">Delivery boy</th>
                      <th className="px-3 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {orders.map((o) => {
                      const un = !o.assignedToId;
                      const done = o.status === 'delivered' || o.status === 'cancelled';
                      return (
                        <tr
                          key={o.id}
                          className={`${un ? 'bg-brand-50/60' : 'hover:bg-ink-50'} ${
                            flashIds.has(o.id) ? 'pk-flash' : ''
                          }`}
                        >
                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={picked.has(o.id)}
                              onChange={() => toggle(o.id)}
                              className="size-4"
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-base font-bold text-black">
                                {o.orderNumber}
                              </span>
                              {o.source === 'manual' && (
                                <span className="rounded bg-brand-200 px-1 text-[10px] font-bold text-brand-900">
                                  MANUAL
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink-400">{fmtDateTime(o.orderDate)}</div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <PincodeBadge pincode={o.pincode} size="sm" />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="font-semibold text-black">{o.customerName}</div>
                            {o.phone && (
                              <a
                                href={telHref(o.phone)}
                                className="font-mono text-ink-500 tabular-nums"
                              >
                                {prettyPhone(o.phone)}
                              </a>
                            )}
                            <div className="max-w-[220px] text-xs text-ink-500">{o.address}</div>
                          </td>
                          <td className="max-w-[230px] px-3 py-3 align-top">
                            {(o.products || []).map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="font-medium text-black">{p.name}</span>
                                <span className="rounded bg-black px-1.5 text-xs font-bold text-white">
                                  ×{p.qty}
                                </span>
                                <span className="tabular-nums text-ink-600">₹{p.price}</span>
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-3 text-right align-top font-bold tabular-nums">
                            ₹{o.totalPrice}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <StatusChip status={o.status} />
                            <StatusDetail order={o} />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <select
                              value={o.assignedToId || ''}
                              disabled={busyIds.has(o.id)}
                              onChange={(e) =>
                                assign([o.id], e.target.value ? Number(e.target.value) : null)
                              }
                              className={`w-full rounded-lg border px-2 py-1.5 text-sm disabled:opacity-50 ${
                                un ? 'border-brand-400 bg-white' : 'border-ink-300 bg-white'
                              }`}
                            >
                              <option value="">Not assigned</option>
                              {riders.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            {o.assignedByName && (
                              <div className="mt-1 text-[11px] text-ink-400">
                                by {o.assignedByName}
                                {o.assignedByRole === 'admin' ? '' : ' (rider)'}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {!done && (
                              <button
                                onClick={() => setModal({ type: 'cancel', order: o })}
                                className="btn btn-ghost px-2.5 py-1.5 text-xs text-stop-600"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </>
      )}

      {modal?.type === 'newOrder' && (
        <Modal title="New order" onClose={() => setModal(null)}>
          <NewOrderForm
            riders={riders}
            onDone={(msg) => {
              setModal(null);
              setToast(msg);
              load(true);
            }}
          />
        </Modal>
      )}
      {modal?.type === 'cancel' && (
        <Modal title="Cancel this order" onClose={() => setModal(null)}>
          <CancelForm
            order={modal.order}
            onConfirm={(reason, note) => cancelOrder(modal.order.id, reason, note)}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === 'account' && (
        <Modal title="Admin credentials" onClose={() => setModal(null)}>
          <AccountForm
            onDone={(msg) => {
              setModal(null);
              setToast(msg);
            }}
          />
        </Modal>
      )}
      {modal?.type === 'newRider' && (
        <Modal title="Add delivery boy" onClose={() => setModal(null)}>
          <RiderForm
            onDone={(msg) => {
              setModal(null);
              setToast(msg);
              load(true);
            }}
          />
        </Modal>
      )}
      {modal?.type === 'editRider' && (
        <Modal title={`Edit ${modal.rider.name}`} onClose={() => setModal(null)}>
          <RiderForm
            rider={modal.rider}
            onDone={(msg) => {
              setModal(null);
              setToast(msg);
              load(true);
            }}
          />
        </Modal>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-5 z-50 rounded-xl bg-brand-900 px-4 py-3 text-center font-medium text-white shadow-xl md:left-auto md:right-6 md:w-80">
          {toast}
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ pieces */

function MenuItem({ children, onClick, active, danger }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-4 py-3 text-left text-sm font-medium hover:bg-brand-50 ${
        danger ? 'text-stop-600' : active ? 'bg-brand-50 text-brand-700' : 'text-black'
      }`}
    >
      {children}
    </button>
  );
}

function StatButton({ label, value, tone, on, onClick }) {
  const tones = {
    brand: 'text-brand-600',
    good: 'text-good-600',
    stop: 'text-stop-600',
    warn: 'text-warn-600',
  };
  return (
    <button
      onClick={onClick}
      className={`btn flex-col items-start rounded-xl border px-3 py-2.5 text-left shadow-sm ${
        on ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-200' : 'border-ink-200 bg-white'
      }`}
    >
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${tones[tone] || 'text-black'}`}>
        {value}
      </span>
    </button>
  );
}

function StatusChip({ status }) {
  const s = STATUSES[status] || STATUSES.pending;
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${s.chip}`}>
      {s.label}
    </span>
  );
}

function StatusDetail({ order: o }) {
  if (o.status === 'rescheduled')
    return (
      <div className="mt-1 max-w-[200px] text-xs text-warn-900">
        {o.pendingUntil && <b>→ {fmtDate(o.pendingUntil)} </b>}
        {o.pendingNote}
      </div>
    );
  if (o.status === 'cancelled')
    return (
      <div className="mt-1 max-w-[200px] text-xs text-ink-500">
        {o.cancelReason}
        {o.cancelNote ? ` — ${o.cancelNote}` : ''}
      </div>
    );
  if (o.status === 'delivered')
    return (
      <div className="mt-1 text-xs text-ink-500">
        {fmtDateTime(o.deliveredAt)}
        {o.paymentMode && (
          <b className="ml-1 text-good-600">{o.paymentMode === 'cash' ? 'Cash' : 'Online'}</b>
        )}
      </div>
    );
  return null;
}

function AdminOrderCard({ order: o, riders, picked, busy, flash, onToggle, onAssign, onCancel }) {
  const un = !o.assignedToId;
  const done = o.status === 'delivered' || o.status === 'cancelled';

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
        un ? 'ring-brand-300' : 'ring-ink-200'
      } ${flash ? 'pk-flash' : ''}`}
    >
      <div className={`flex items-center gap-2 px-3 py-2.5 ${un ? 'bg-brand-50' : 'bg-ink-50'}`}>
        <input type="checkbox" checked={picked} onChange={onToggle} className="size-4" />
        <span className="font-mono font-bold text-black">{o.orderNumber}</span>
        {o.source === 'manual' && (
          <span className="rounded bg-brand-200 px-1.5 text-[10px] font-bold text-brand-900">
            MANUAL
          </span>
        )}
        <span className="ml-auto font-bold tabular-nums">₹{o.totalPrice}</span>
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-black">{o.customerName}</div>
            {o.phone && (
              <a href={telHref(o.phone)} className="font-mono text-sm text-ink-500 tabular-nums">
                {prettyPhone(o.phone)}
              </a>
            )}
          </div>
          <PincodeBadge pincode={o.pincode} />
        </div>

        <StatusChip status={o.status} />
        <p className="text-sm text-ink-600">{o.address}</p>

        <ul className="rounded-lg bg-ink-50 px-2.5 py-1.5">
          {(o.products || []).map((p, i) => (
            <li key={i} className="flex items-center gap-2 py-0.5 text-sm">
              <span className="min-w-0 flex-1 font-medium">{p.name}</span>
              <span className="rounded bg-black px-1.5 text-xs font-bold text-white">×{p.qty}</span>
              <span className="tabular-nums">₹{p.price}</span>
            </li>
          ))}
        </ul>

        <StatusDetail order={o} />

        <select
          value={o.assignedToId || ''}
          disabled={busy}
          onChange={(e) => onAssign(e.target.value ? Number(e.target.value) : null)}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium disabled:opacity-50 ${
            un ? 'border-brand-400 bg-brand-50' : 'border-ink-300'
          }`}
        >
          <option value="">Not assigned</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {o.assignedByName && (
          <p className="text-xs text-ink-400">
            Given by {o.assignedByName}
            {o.assignedByRole === 'admin' ? ' (admin)' : ' (rider)'}
          </p>
        )}

        {!done && (
          <button onClick={onCancel} className="btn btn-ghost w-full py-2.5 text-sm text-stop-600">
            Cancel order
          </button>
        )}
      </div>
    </article>
  );
}

function CancelForm({ order, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const needsNote = reason === 'Other';
  const canSend = reason && (!needsNote || note.trim());

  return (
    <div className="mt-3">
      <p className="text-sm text-ink-500">
        {order.customerName} · {order.orderNumber}
      </p>

      <div className="mt-4 space-y-2">
        {CANCEL_REASONS.map((r) => (
          <label
            key={r}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
              reason === r ? 'border-stop-500 bg-stop-50' : 'border-ink-200'
            }`}
          >
            <input
              type="radio"
              name="areason"
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

      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="btn btn-ghost flex-1 py-3.5">
          Go back
        </button>
        <button
          onClick={() => onConfirm(reason, note.trim())}
          disabled={!canSend}
          className="btn btn-red flex-1 py-3.5"
        >
          Cancel order
        </button>
      </div>
    </div>
  );
}

function TeamPanel({ team, onAdd, onEdit, onToast, reload }) {
  async function toggleActive(r) {
    const res = await fetch(`/api/users/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !r.active }),
    });
    const d = await res.json();
    onToast(res.ok ? (r.active ? `${r.name} turned off` : `${r.name} turned on`) : d.error);
    reload();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-black">Rider credentials</h2>
        <button onClick={onAdd} className="btn btn-blue ml-auto px-3.5 py-2 text-sm">
          + Add delivery boy
        </button>
      </div>

      {team.length === 0 && (
        <p className="rounded-2xl border border-ink-200 bg-white p-8 text-center text-ink-500">
          No delivery boys yet. Add one and they can sign in with their phone number.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border border-ink-200 bg-white p-4 shadow-sm ${
              r.active ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                <UserIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-black">{r.name}</div>
                <div className="font-mono text-sm text-ink-500 tabular-nums">
                  {prettyPhone(r.phone)}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Signs in with {r.phone} · {r.active ? 'active' : 'turned off'}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onEdit(r)} className="btn btn-ghost flex-1 py-2 text-sm">
                Edit
              </button>
              <button onClick={() => toggleActive(r)} className="btn btn-ghost flex-1 py-2 text-sm">
                {r.active ? 'Turn off' : 'Turn on'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-7 shadow-2xl md:max-w-lg md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-200 md:hidden" />
        <h2 className="text-lg font-semibold text-black">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Input({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {hint && <span className="ml-1 text-xs text-ink-400">{hint}</span>}
      <input
        {...props}
        className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3 outline-none focus:border-brand-600"
      />
    </label>
  );
}

function RiderForm({ rider, onDone }) {
  const [name, setName] = useState(rider?.name || '');
  const [phone, setPhone] = useState(rider?.phone || '');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr('');
    const res = await fetch(rider ? `/api/users/${rider.id}` : '/api/users', {
      method: rider ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, ...(password ? { password } : {}) }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(d.error || 'Could not save');
    onDone(rider ? `${name} updated` : `${name} added`);
  }

  return (
    <div className="mt-4 space-y-3">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Phone number"
        hint="this is their login id"
        value={phone}
        inputMode="numeric"
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input
        label={rider ? 'New password' : 'Password'}
        hint={rider ? 'blank keeps the old one' : ''}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err && <p className="rounded-lg bg-stop-50 px-3 py-2 text-sm text-stop-600">{err}</p>}
      <button onClick={submit} disabled={busy} className="btn btn-blue w-full py-3.5">
        {busy && <span className="pk-spinner" />}
        {busy ? 'Saving' : rider ? 'Save changes' : 'Add delivery boy'}
      </button>
    </div>
  );
}

function AccountForm({ onDone }) {
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
    onDone('Account updated');
  }

  return (
    <div className="mt-4 space-y-3">
      <Input
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <Input
        label="New phone number"
        hint="blank keeps the same"
        inputMode="numeric"
        value={newPhone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input
        label="New password"
        hint="blank keeps the same"
        type="password"
        value={newPassword}
        onChange={(e) => setPass(e.target.value)}
      />
      {err && <p className="rounded-lg bg-stop-50 px-3 py-2 text-sm text-stop-600">{err}</p>}
      <button
        onClick={save}
        disabled={busy || !currentPassword}
        className="btn btn-blue w-full py-3.5"
      >
        {busy && <span className="pk-spinner" />}
        {busy ? 'Saving' : 'Save changes'}
      </button>
    </div>
  );
}

function NewOrderForm({ riders, onDone }) {
  const [f, setF] = useState({
    customerName: '',
    phone: '',
    pincode: '',
    address: '',
    riderId: '',
  });
  const [items, setItems] = useState([{ name: '', qty: 1, price: '' }]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const area = areaFor(f.pincode);
  const phoneOk = String(f.phone).replace(/\D/g, '').length >= 10;

  const setItem = (i, k, v) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  async function submit() {
    setBusy(true);
    setErr('');
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, products: items }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(d.error || 'Could not create');
    onDone(`Order ${d.order.orderNumber} created`);
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        Only the phone number is needed. Fill the rest in later if you are in a hurry.
      </p>

      <Input
        label="Phone number"
        hint="required"
        value={f.phone}
        inputMode="numeric"
        onChange={(e) => setF({ ...f, phone: e.target.value })}
      />
      <Input
        label="Customer name"
        hint="optional"
        value={f.customerName}
        onChange={(e) => setF({ ...f, customerName: e.target.value })}
      />

      <div>
        <Input
          label="Pincode"
          hint="optional"
          value={f.pincode}
          inputMode="numeric"
          onChange={(e) => setF({ ...f, pincode: e.target.value })}
        />
        {String(f.pincode).replace(/\D/g, '').length >= 6 && (
          <p className={`mt-1 text-sm font-semibold ${area ? 'text-good-600' : 'text-warn-600'}`}>
            {area || 'No area name saved for this pincode yet'}
          </p>
        )}
      </div>

      <Input
        label="Address"
        hint="optional"
        value={f.address}
        onChange={(e) => setF({ ...f, address: e.target.value })}
      />

      <div>
        <span className="text-sm font-medium text-ink-700">Products</span>
        <span className="ml-1 text-xs text-ink-400">optional</span>
        <div className="mt-1 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={it.name}
                onChange={(e) => setItem(i, 'name', e.target.value)}
                placeholder="Product name"
                className="min-w-0 flex-1 rounded-xl border border-ink-300 px-3 py-2.5 outline-none focus:border-brand-600"
              />
              <input
                value={it.qty}
                onChange={(e) => setItem(i, 'qty', e.target.value)}
                inputMode="numeric"
                className="w-14 rounded-xl border border-ink-300 px-2 py-2.5 text-center outline-none"
              />
              <input
                value={it.price}
                onChange={(e) => setItem(i, 'price', e.target.value)}
                inputMode="numeric"
                placeholder="₹"
                className="w-20 rounded-xl border border-ink-300 px-2 py-2.5 outline-none"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setItems([...items, { name: '', qty: 1, price: '' }])}
          className="btn btn-plain mt-2 px-0 text-sm text-brand-700"
        >
          + Add another product
        </button>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-ink-700">Give to</span>
        <span className="ml-1 text-xs text-ink-400">optional</span>
        <select
          value={f.riderId}
          onChange={(e) => setF({ ...f, riderId: e.target.value })}
          className="mt-1 w-full rounded-xl border border-ink-300 px-3.5 py-3"
        >
          <option value="">Leave unassigned</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      {err && <p className="rounded-lg bg-stop-50 px-3 py-2 text-sm text-stop-600">{err}</p>}

      <button onClick={submit} disabled={busy || !phoneOk} className="btn btn-blue w-full py-3.5">
        {busy && <span className="pk-spinner" />}
        {busy ? 'Creating' : 'Create order'}
      </button>
    </div>
  );
}
