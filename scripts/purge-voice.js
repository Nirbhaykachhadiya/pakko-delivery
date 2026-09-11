// Strips voice notes from orders that are finished and older than 7 days, so
// audio never piles up against the storage limit. Text notes are kept.
//
//   node scripts/purge-voice.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date(Date.now() - 7 * 86400000);

  const res = await prisma.order.updateMany({
    where: {
      voiceNote: { not: null },
      status: { in: ['delivered', 'cancelled'] },
      updatedAt: { lt: cutoff },
    },
    data: { voiceNote: null, voiceNoteSec: null },
  });

  console.log(`Cleared voice notes from ${res.count} finished orders.`);

  const left = await prisma.order.count({ where: { voiceNote: { not: null } } });
  console.log(`${left} orders still hold a recording.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
