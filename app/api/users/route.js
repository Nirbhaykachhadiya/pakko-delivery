import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = (p) => String(p || '').replace(/\D/g, '');

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Riders need the list too, so they can hand an order to someone else
  const riders = await prisma.user.findMany({
    where: { role: 'delivery', active: true },
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' },
  });

  if (user.role !== 'admin') return NextResponse.json({ riders });

  const all = await prisma.user.findMany({
    where: { role: 'delivery' },
    select: { id: true, name: true, phone: true, active: true, createdAt: true },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json({ riders, all });
}

export async function POST(req) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { name, phone, password } = await req.json();
  const p = clean(phone);

  if (!name?.trim()) return NextResponse.json({ error: 'Enter a name' }, { status: 400 });
  if (p.length < 10)
    return NextResponse.json({ error: 'Enter a 10 digit phone number' }, { status: 400 });
  if (!password || password.length < 4)
    return NextResponse.json({ error: 'Password needs at least 4 characters' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { phone: p } });
  if (exists) {
    return NextResponse.json(
      { error: 'That phone number is already used by ' + exists.name },
      { status: 400 }
    );
  }

  const rider = await prisma.user.create({
    data: {
      name: name.trim(),
      phone: p,
      role: 'delivery',
      passwordHash: await hashPassword(password),
    },
    select: { id: true, name: true, phone: true, active: true },
  });

  return NextResponse.json({ ok: true, rider });
}
