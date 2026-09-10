// Deletes orders older than ORDER_CUTOFF so the database matches what you see.
// Run: node scripts/purge-old.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const src = require('fs').readFileSync('lib/constants.js', 'utf8');
  const m = src.match(/ORDER_CUTOFF\s*=\s*'([\d-]+)'/);
  if (!m) return console.log('Could not read ORDER_CUTOFF from lib/constants.js');

  const cutoff = new Date(`${m[1]}T00:00:00`);
  const count = await prisma.order.count({ where: { orderDate: { lt: cutoff } } });

  if (!count) return console.log(`Nothing older than ${m[1]}.`);

  const res = await prisma.order.deleteMany({ where: { orderDate: { lt: cutoff } } });
  console.log(`Deleted ${res.count} orders from before ${m[1]}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
