const fs = require("fs");
const env = {};
fs.readFileSync(".env", "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^\s*([\w.]+)\s*=\s*"?([^"\r\n]*)"?/);
    if (m) env[m[1]] = m[2];
  });

async function run() {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-07/orders.json?status=any&limit=1`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": env.SHOPIFY_ACCESS_TOKEN },
  });
  const { orders } = await res.json();
  const o = orders[0];

  console.log("customer object      :", JSON.stringify(o.customer));
  console.log("shipping_address     :", JSON.stringify(o.shipping_address));
  console.log("billing_address      :", JSON.stringify(o.billing_address));
  console.log("order.phone          :", o.phone);
  console.log("order.email          :", o.email);
  console.log("contact_email        :", o.contact_email);
  console.log("note                 :", o.note);
  console.log("note_attributes      :", JSON.stringify(o.note_attributes));
}
run().catch((e) => console.error(e.message));
