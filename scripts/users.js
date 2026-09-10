// ============================================================================
//  MANAGE LOGINS - add, rename, change password, deactivate
// ============================================================================
//
//   node scripts/users.js list
//   node scripts/users.js add "Ramesh Bhai" 9876543210 mypass123 delivery
//   node scripts/users.js add "Krishna" 9876500000 adminpass admin
//   node scripts/users.js rename 9876543210 "Ramesh Patel"
//   node scripts/users.js password 9876543210 newpass456
//   node scripts/users.js phone 9876543210 9998887777
//   node scripts/users.js off 9876543210        (hide, keeps their history)
//   node scripts/users.js on  9876543210
//
//  The phone number IS the login id. Passwords are hashed, so they can't be
//  read back - if someone forgets one, set a new one with `password`.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const [cmd, ...args] = process.argv.slice(2);

const clean = (p) => String(p).replace(/\D/g, '');

async function list() {
  const users = await prisma.user.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });
  if (!users.length) return console.log('No users yet.');
  console.log('');
  users.forEach((u) => {
    console.log(
      `  ${u.active ? ' ' : '(off) '}${u.role.padEnd(9)} ${u.name.padEnd(20)} ${u.phone}`
    );
  });
  console.log('');
}

async function add([name, phone, password, role = 'delivery']) {
  if (!name || !phone || !password) {
    return console.log('Usage: node scripts/users.js add "Name" 9876543210 password [admin|delivery]');
  }
  if (!['admin', 'delivery'].includes(role)) {
    return console.log('Role must be admin or delivery');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { phone: clean(phone) },
    update: { name, role, passwordHash, active: true },
    create: { name, phone: clean(phone), role, passwordHash },
  });
  console.log(`Saved ${role} "${name}" - logs in with ${clean(phone)}`);
}

async function rename([phone, name]) {
  if (!phone || !name) return console.log('Usage: rename 9876543210 "New Name"');
  await prisma.user.update({ where: { phone: clean(phone) }, data: { name } });
  console.log(`Renamed to "${name}"`);
}

async function password([phone, pw]) {
  if (!phone || !pw) return console.log('Usage: password 9876543210 newpassword');
  await prisma.user.update({
    where: { phone: clean(phone) },
    data: { passwordHash: await bcrypt.hash(pw, 10) },
  });
  console.log('Password changed');
}

async function changePhone([oldPhone, newPhone]) {
  if (!oldPhone || !newPhone) return console.log('Usage: phone 9876543210 9998887777');
  await prisma.user.update({
    where: { phone: clean(oldPhone) },
    data: { phone: clean(newPhone) },
  });
  console.log(`Login id is now ${clean(newPhone)}`);
}

async function setActive([phone], active) {
  if (!phone) return console.log('Usage: off 9876543210');
  await prisma.user.update({ where: { phone: clean(phone) }, data: { active } });
  console.log(active ? 'Enabled' : 'Disabled - past orders are kept');
}

async function main() {
  switch (cmd) {
    case 'list': return list();
    case 'add': return add(args);
    case 'rename': return rename(args);
    case 'password': return password(args);
    case 'phone': return changePhone(args);
    case 'off': return setActive(args, false);
    case 'on': return setActive(args, true);
    default:
      console.log('Commands: list | add | rename | password | phone | off | on');
      console.log('Open scripts/users.js to see examples.');
  }
}

main()
  .catch((e) => console.error(e.message))
  .finally(() => prisma.$disconnect());
