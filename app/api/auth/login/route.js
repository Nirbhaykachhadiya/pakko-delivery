import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  const { phone, password } = await req.json();

  if (!phone || !password) {
    return NextResponse.json(
      { error: 'Phone and password required' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (!user || !user.active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  await setAuthCookie(signToken(user));

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
  });
}
