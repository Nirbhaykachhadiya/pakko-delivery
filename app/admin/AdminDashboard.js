'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUSES, fmtDateTime, fmtDate, telHref, prettyPhone } from '@/lib/constants';
import { areaFor } from '@/lib/pincodes';
import PincodeBadge from '@/components/PincodeBadge';
import DateRange from '@/components/DateRange';

// Admin lands on the only thing that needs action: orders nobody is carrying.
const DEFAULT_FILTERS = { status: '', rider: 'unassigned', q: '', from: '', to: '' };

export default function AdminDashboard({ user }) {
  const router = useRouter();

  const [view, setView] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [team, setTeam] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set());
  const [flashIds, setFlashIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const sq = new URLSearchParams();
    if (filters.from) sq.set('from', filters.from);
    if (filters.to) sq.set('to', filters.to);
    if (filters.rider) sq.set('rider', filters.rider);

    const [o, s, u] = await Promise.all([
      fetch(`/api/orders?${query}`).then((x) => x.json()),
      fetch(`/api/stats?${sq}`).then((x) => x.json()),
      fetch('/api/users').then((x) => x.json()),
    ]);

    setOrders(o.orders || []);
    setStats(s);
    setRiders(u.riders || []);
    setTeam(u.all || []);
    setPicked(new Set());
    setLoading(false);
  }, [query, filters.from, filters.to, filters.rider]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function sync() {
    setSyncing(true);
    const res = await fetch('/api/sync', { method: 'POST' });
    const d = await res.json();
    setSyncing(false);
    setToast(res.ok ? `Synced · ${d.created} new, ${d.updated} updated` : d.error || 'Sync failed');
    if (res.ok) load();
  }

  async function assign(orderIds, riderId) {
    setBusyIds(new Set(orderIds));
    const res = await fetch('/api/orders/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds, riderId }),
    });
    const d = await res.json();
    setBusyIds(new Set());
    if (!res.ok) return setToast(d.error || 'Could not assign');

    setFlashIds(new Set(orderIds));
    setTimeout(() => setFlashIds(new Set()), 950);

    const who = riderId ? riders.find((r) => r.id === Number(riderId))?.name : null;
    setToast(who ? `Given to ${who}` : 'Assignment removed');
    load();
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

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v && v !== DEFAULT_FILTERS[k]
  ).length;

  const scopeLabel =
    filters.rider === 'unassigned'
      ? 'Not assigned'
      : filters.rider
        ? riders.find((r) => r.id === Number(filters.rider))?.name || 'Rider'
        : 'Everyone';

  return (
    <main className="min-h-dvh bg-white pb-10">
      <header className="sticky top-0 z-30 bg-brand-600 text-white">
        <div className="mx-auto flex max-w-[1700px] items-center gap-2 px-3 py-3 md:px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-200 text-sm font-bold text-brand-900">
            PA
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">Pakko Amdavadi</div>
            <div className="text-xs text-brand-100">Delivery control</div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setModal({ type: 'newOrder' })}
              className="btn btn-light px-3 py-2 text-sm"
            >
              + Order
            </button>
            <button onClick={sync} disabled={syncing} className="btn btn-plain bg-brand-700 px-3 py-2 text-sm">
              {syncing && <span className="pk-spinner" />}
              {syncing ? 'Syncing' : 'Sync'}
            </button>
            <button
              onClick={() => setModal({ type: 'account' })}
              className="btn btn-plain px-2.5 py-2 text-sm text-brand-100"
            >
              Account
            </button>
            {/* Always visible, on every screen size */}
            <button onClick={logout} className="btn btn-plain px-2.5 py-2 text-sm text-brand-100">
              Sign out
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1700px] gap-1 px-3 md:px-5">
          {[
            { k: 'orders', l: 'Orders' },
            { k: 'team', l: 'Delivery boys' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setView(t.k)}
              className={`border-b-[3px] px-3 py-2.5 text-sm font-medium ${
                view === t.k ? 'border-brand-200 text-white' : 'border-transparent text-brand-200'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-[1700px] space-y-4 p-3 md:p-5">
        {view === 'team' ? (
          <TeamPanel
            team={team}
            onAdd={() => setModal({ type: 'newRider' })}
            onEdit={(r) => setModal({ type: 'editRider', rider: r })}
            onToast={setToast}
            reload={load}
          />
        ) : (
          <>
            {/* ---- Filter bar ---- */}
            <section className="rounded-2xl border border-ink-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <input
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder="Search name, phone, pincode, order no."
                  className="min-w-0 flex-1 rounded-xl border border-ink-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600"
                />
                <button
                  onClick={() => setShowFilters((s) => !s)}
                  className={`btn px-3.5 py-2.5 text-sm ${
                    showFilters || activeCount ? 'btn-blue' : 'btn-ghost'
                  }`}
                >
                  Filters{activeCount ? ` · ${activeCount}` : ''}
                </button>
                {activeCount > 0 && (
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="btn btn-ghost px-3 py-2.5 text-sm"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Quick scope chips - always visible, the thing used most */}
              <div className="no-bar flex gap-2 overflow-x-auto border-t border-ink-100 px-3 py-2.5">
                <ScopeChip
                  on={filters.rider === 'unassigned'}
                  onClick={() => setFilters({ ...filters, rider: 'unassigned' })}
                  count={stats?.unassigned}
                >
                  Not assigned
                </ScopeChip>
                <ScopeChip
                  on={filters.rider === ''}
                  onClick={() => setFilters({ ...filters, rider: '' })}
                >
                  Everyone
                </ScopeChip>
                {riders.map((r) => (
                  <ScopeChip
                    key={r.id}
                    on={filters.rider === String(r.id)}
                    onClick={() => setFilters({ ...filters, rider: String(r.id) })}
                  >
                    {r.name}
                  </ScopeChip>
                ))}
              </div>

              {showFilters && (
                <div className="space-y-3 border-t border-ink-100 p-3">
                  <div>
                    <span className="text-xs font-semibold text-ink-600">Date</span>
                    <div className="mt-1.5">
                      <DateRange
                        value={{ from: filters.from, to: filters.to }}
                        onChange={(r) => setFilters({ ...filters, ...r })}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-ink-600">Status</span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <ScopeChip
                        on={filters.status === ''}
                        onClick={() => setFilters({ ...filters, status: '' })}
                      >
                        Any
                      </ScopeChip>
                      {Object.entries(STATUSES).map(([k, v]) => (
                        <ScopeChip
                          key={k}
                          on={filters.status === k}
                          onClick={() => setFilters({ ...filters, status: k })}
                        >
                          {v.label}
                        </ScopeChip>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ---- Stats, following the same filters ---- */}
            {stats && (
              <>
                <p className="text-sm text-ink-500">
                  Showing <b className="text-black">{scopeLabel}</b>
                  {filters.from || filters.to ? ' for the chosen dates' : ' · all dates'}
                </p>
                <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="Total" value={stats.total} />
                  <Stat label="Not assigned" value={stats.unassigned} tone="brand" />
                  <Stat label="Assigned" value={stats.counts.out_for_delivery} tone="brand" />
                  <Stat label="Pending" value={stats.counts.rescheduled} tone="warn" />
                  <Stat label="Delivered" value={stats.counts.delivered} tone="good" />
                  <Stat label="Cancelled" value={stats.counts.cancelled} tone="stop" />
                </section>
              </>
            )}

            {stats?.riderStats?.length > 0 && (
              <section className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-ink-100 bg-ink-50 text-left text-ink-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Delivery boy</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                      <th className="px-3 py-2.5 text-right font-medium">Assigned</th>
                      <th className="px-3 py-2.5 text-right font-medium">Pending</th>
                      <th className="px-3 py-2.5 text-right font-medium">Delivered</th>
                      <th className="px-3 py-2.5 text-right font-medium">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {stats.riderStats.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setFilters({ ...filters, rider: String(r.id) })}
                        className="cursor-pointer hover:bg-brand-50"
                      >
                        <td className="px-4 py-2.5 font-semibold text-black">{r.name}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{r.assigned}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-brand-700">
                          {r.toDeliver}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-warn-600">
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

            {picked.size > 0 && (
              <div className="sticky top-[112px] z-20 flex flex-wrap items-center gap-2 rounded-xl bg-brand-800 px-3 py-2.5 text-white shadow-lg">
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

            {loading && <p className="py-16 text-center text-ink-400">Loading orders…</p>}

            {!loading && orders.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-ink-500">Nothing here with these filters.</p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="btn btn-ghost mt-3 px-4 py-2 text-sm"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {!loading &&
                orders.map((o) => (
                  <AdminOrderCard
                    key={o.id}
                    order={o}
                    riders={riders}
                    picked={picked.has(o.id)}
                    busy={busyIds.has(o.id)}
                    flash={flashIds.has(o.id)}
                    onToggle={() => toggle(o.id)}
                    onAssign={(rid) => assign([o.id], rid)}
                  />
                ))}
            </div>

            {/* Desktop table */}
            {!loading && orders.length > 0 && (
              <section className="hidden overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm md:block">
                <table className="w-full min-w-[1200px] text-sm">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {orders.map((o) => {
                      const un = !o.assignedToId;
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
                          <td className="max-w-[240px] px-3 py-3 align-top">
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </div>

      {modal?.type === 'newOrder' && (
        <Modal title="New order" onClose={() => setModal(null)}>
          <NewOrderForm
            riders={riders}
            onDone={(msg) => {
              setModal(null);
              setToast(msg);
              load();
            }}
          />
        </Modal>
      )}
      {modal?.type === 'account' && (
        <Modal title="My account" onClose={() => setModal(null)}>
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
              load();
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
              load();
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

function ScopeChip({ on, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      className={`btn shrink-0 px-3.5 py-2 text-sm ${
        on ? 'btn-blue' : 'bg-brand-50 text-brand-800 ring-1 ring-brand-200'
      }`}
    >
      {children}
      {typeof count === 'number' && (
        <span className={`tabular-nums ${on ? 'text-brand-100' : 'text-brand-600'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    brand: 'text-brand-600',
    good: 'text-good-600',
    stop: 'text-stop-600',
    warn: 'text-warn-600',
  };
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${tones[tone] || 'text-black'}`}>
        {value}
      </div>
    </div>
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

function AdminOrderCard({ order: o, riders, picked, busy, flash, onToggle, onAssign }) {
  const un = !o.assignedToId;

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

        <div className="flex items-center gap-2">
          <StatusChip status={o.status} />
        </div>

        <p className="text-sm text-ink-600">{o.address}</p>

        <ul className="rounded-lg bg-ink-50 px-2.5 py-1.5">
          {(o.products || []).map((p, i) => (
            <li key={i} className="flex items-center gap-2 py-0.5 text-sm">
              <span className="min-w-0 flex-1 font-medium">{p.name}</span>
              <span className="rounded bg-black px-1.5 text-xs font-bold text-white">
                ×{p.qty}
              </span>
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
      </div>
    </article>
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
        <h2 className="font-semibold text-black">Delivery boys</h2>
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
              <span className="grid size-10 place-items-center rounded-xl bg-brand-200 font-bold text-brand-900">
                {r.name.slice(0, 2).toUpperCase()}
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
              <button
                onClick={() => toggleActive(r)}
                className="btn btn-ghost flex-1 py-2 text-sm"
              >
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
          <p
            className={`mt-1 text-sm font-semibold ${area ? 'text-good-600' : 'text-warn-600'}`}
          >
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

      <button
        onClick={submit}
        disabled={busy || !phoneOk}
        className="btn btn-blue w-full py-3.5"
      >
        {busy && <span className="pk-spinner" />}
        {busy ? 'Creating' : 'Create order'}
      </button>
    </div>
  );
}
