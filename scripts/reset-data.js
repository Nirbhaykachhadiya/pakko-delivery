// ============================================================================
//  CLEAN SLATE
//  ----------------------------------------------------------------------
//  Deletes every order, and optionally every delivery boy, so you can start
//  fresh. Your admin login is never touched.
//
//    node scripts/reset-data.js orders     delete all orders only
//    node scripts/reset-data.js riders     delete all delivery boys only
//    node scripts/reset-data.js all        delete both
//
//  This cannot be undone. Orders come back on the next Sync (from the
//  MIN_ORDER_NUMBER set in lib/constants.js). Delivery boys do not - you
//  re-add them from the Rider credentials screen.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const what = process.argv[2];

async function main() {
  if (!['orders', 'riders', 'all'].includes(what)) {
    console.log('Usage: node scripts/reset-data.js orders | riders | all');
    return;
  }

  if (what === 'orders' || what === 'all') {
    const n = await prisma.order.count();
    await prisma.order.deleteMany({});
    console.log(`Deleted ${n} orders. Press Sync in the app to pull them back.`);
  }

  if (what === 'riders' || what === 'all') {
    // Detach any orders still pointing at a rider, then remove the riders
    await prisma.order.updateMany({
      where: { assignedToId: { not: null } },
      data: {
        assignedToId: null,
        assignedAt: null,
        assignedById: null,
        assignedByName: null,
        assignedByRole: null,
        status: 'pending',
      },
    });
    const n = await prisma.user.count({ where: { role: 'delivery' } });
    await prisma.user.deleteMany({ where: { role: 'delivery' } });
    console.log(`Deleted ${n} delivery boys. Admin logins are untouched.`);
  }

  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { name: true, phone: true },
  });
  console.log('\nAdmin logins still active:');
  admins.forEach((a) => console.log(`  ${a.name} - ${a.phone}`));
}

main()
  .catch((e) => console.error(e.message))
  .finally(() => prisma.$disconnect());
