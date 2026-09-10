const fs = require("fs");

const env = {};
fs.readFileSync(".env", "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^\s*([\w.]+)\s*=\s*"?([^"\r\n]*)"?/);
    if (m) env[m[1]] = m[2];
  });

const API_VERSION = "2025-07";

async function run() {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/orders.json?status=any&limit=3`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": env.SHOPIFY_ACCESS_TOKEN },
  });

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}`);
    console.error(await res.text());
    if (res.status === 401)
      console.error(
        "→ Token invalid/revoked. Uninstall+reinstall to get a fresh one.",
      );
    if (res.status === 403)
      console.error("→ Protected customer data / scope issue.");
    return;
  }

  const { orders } = await res.json();
  console.log(`✅ Fetched ${orders.length} order(s)\n`);
  if (!orders.length) return console.log("No orders in store.");

  console.log("======= THE PII TEST =======");
  orders.forEach((o) => {
    const ship = o.shipping_address || {};
    const name =
      `${o.customer?.first_name || ""} ${o.customer?.last_name || ""}`.trim();
    const phone = o.phone || ship.phone || o.customer?.phone;
    const addr = [ship.address1, ship.city, ship.zip]
      .filter(Boolean)
      .join(", ");

    console.log(`\n--- ${o.name} ---`);
    console.log("  NAME    :", name || "❌ REDACTED");
    console.log("  PHONE   :", phone || "❌ REDACTED");
    console.log("  ADDRESS :", addr || "❌ REDACTED");
    console.log(
      "  PRODUCTS:",
      (o.line_items || [])
        .map((li) => `${li.name} x${li.quantity}`)
        .join(" | "),
    );
  });
  console.log("\n============================");
}

run().catch((e) => console.error("❌", e.message));
