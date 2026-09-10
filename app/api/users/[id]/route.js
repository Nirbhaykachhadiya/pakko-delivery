import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';

const clean = (p) => String(p || '').replace(/\D/g, '');

export async function PATCH(req, { params }) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { name, phone, password, active } = await req.json();

  const data = {};
  if (name?.trim()) data.name = name.trim();
  if (typeof active === 'boolean') data.active = active;

  if (phone) {
    const p = clean(phone);
    if (p.length < 10)
      return NextResponse.json({ error: 'Enter a 10 digit phone number' }, { status: 400 });
    const taken = await prisma.user.findFirst({
      where: { phone: p, id: { not: Number(id) } },
    });
    if (taken) {
      return NextResponse.json({ error: 'That number belongs to ' + taken.name }, { status: 400 });
    }
    data.phone = p;
  }

  if (password) {
    if (password.length < 4)
      return NextResponse.json({ error: 'Password needs at least 4 characters' }, { status: 400 });
    data.passwordHash = await hashPassword(password);
  }

  const rider = await prisma.user.update({
    where: { id: Number(id) },
    data,
    select: { id: true, name: true, phone: true, active: true },
  });

  return NextResponse.json({ ok: true, rider });
}

// Deactivates rather than deletes, so past deliveries keep their history
export async function DELETE(req, { params }) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  await prisma.user.update({
    where: { id: Number(id) },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
