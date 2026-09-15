// Product names arrive from Shopify and from the hand-typed order form, so
// the same item can differ by case or stray spaces. Everything here matches
// on a tidied-up name and keeps the nicest spelling for display.

export const productKey = (name) => String(name || '').trim().toLowerCase();

// "Bullet Massager with 9 Heads" -> "Bullet Mas"
export function shortName(name, len = 10) {
  const clean = String(name || '').trim();
  return clean.length <= len ? clean : clean.slice(0, len).trim();
}

/**
 * Totals every product across these orders. Counts units, not orders - three
 * of one item in a single order counts as three. Busiest product first.
 */
export function productTotals(orders) {
  const totals = new Map();

  for (const o of orders || []) {
    for (const p of o.products || []) {
      const key = productKey(p.name);
      if (!key) continue;
      const row = totals.get(key) || { key, name: String(p.name).trim(), qty: 0, orders: 0 };
      row.qty += Number(p.qty) || 0;
      totals.set(key, row);
    }
    // how many orders carry it at all, counted once even if listed twice
    const seen = new Set((o.products || []).map((p) => productKey(p.name)));
    for (const key of seen) {
      if (key && totals.has(key)) totals.get(key).orders += 1;
    }
  }

  return [...totals.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
}

export const orderHasProduct = (order, key) =>
  (order?.products || []).some((p) => productKey(p.name) === key);
