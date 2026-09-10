import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, verifyPassword, hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export const runtime = 'nodejs';

const clean = (p) => String(p || '').replace(/\D/g, '');

// Lets any signed-in person change their own phone and password.
// Requires the current password, so a borrowed phone can't be used to lock
// someone out of their own account.
export async function POST(req) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { currentPassword, newPhone, newPassword } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  if (!currentPassword) {
    return NextResponse.json({ error: 'Enter your current password' }, { status: 400 });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is wrong' }, { status: 401 });
  }

  const data = {};

  if (newPhone) {
    const p = clean(newPhone);
    if (p.length < 10) {
      return NextResponse.json({ error: 'Enter a 10 digit phone number' }, { status: 400 });
    }
    const taken = await prisma.user.findFirst({ where: { phone: p, id: { not: me.id } } });
    if (taken) {
      return NextResponse.json({ error: 'That number is already used' }, { status: 400 });
    }
    data.phone = p;
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password needs at least 6 characters' },
        { status: 400 }
      );
    }
    data.passwordHash = await hashPassword(newPassword);
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Nothing to change' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: me.id }, data });

  // Reissue the session so the change takes effect without signing out
  await setAuthCookie(signToken(updated));

  return NextResponse.json({
    ok: true,
    user: { id: updated.id, name: updated.name, phone: updated.phone, role: updated.role },
  });
}
