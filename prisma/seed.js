// Run with: node prisma/seed.js
// CHANGE the names/phones/passwords below to your real delivery boys.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const USERS = [
  { name: 'Admin',   phone: '9999900001', password: 'admin123', role: 'admin' },
  { name: 'Rider 1', phone: '9999900011', password: 'rider123', role: 'delivery' },
  { name: 'Rider 2', phone: '9999900012', password: 'rider123', role: 'delivery' },
  { name: 'Rider 3', phone: '9999900013', password: 'rider123', role: 'delivery' },
  { name: 'Rider 4', phone: '9999900014', password: 'rider123', role: 'delivery' },
];

async function main() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: { name: u.name, role: u.role, passwordHash },
      create: { name: u.name, phone: u.phone, role: u.role, passwordHash },
    });
    console.log(`OK  ${u.role.padEnd(8)} ${u.name} (${u.phone})`);
  }
  console.log('\nSeed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
