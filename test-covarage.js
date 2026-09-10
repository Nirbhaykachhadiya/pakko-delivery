const fs = require("fs");
const env = {};
fs.readFileSync(".env", "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^\s*([\w.]+)\s*=\s*"?([^"\r\n]*)"?/);
    if (m) env[m[1]] = m[2];
  });

const pick = (attrs, ...keys) => {
  for (const k of keys) {
    const hit = (attrs || []).find(
      (a) => a.name?.toLowerCase().trim() === k.toLowerCase(),
    );
    if (hit?.value) return hit.value;
  }
  return null;
};

async function run() {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-07/orders.json?status=any&limit=50`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": env.SHOPIFY_ACCESS_TOKEN },
  });
  const { orders } = await res.json();

  let ok = 0,
    bad = [];
  const allKeys = new Set();

  orders.forEach((o) => {
    (o.note_attributes || []).forEach((a) => allKeys.add(a.name));
    const name = pick(o.note_attributes, "Name", "name", "full name");
    const phone = pick(o.note_attributes, "Phone", "phone", "mobile");
    const addr = pick(o.note_attributes, "Address", "address");
    if (name && phone && addr) ok++;
    else
      bad.push({ order: o.name, name: !!name, phone: !!phone, addr: !!addr });
  });

  console.log(`\n✅ Complete data: ${ok}/${orders.length}`);
  if (bad.length) {
    console.log("\n⚠️ Incomplete orders:");
    bad.forEach((b) => console.log(" ", b.order, JSON.stringify(b)));
  }
  console.log("\nAll attribute keys seen:", [...allKeys].join(" | "));
}
run().catch((e) => console.error(e.message));
