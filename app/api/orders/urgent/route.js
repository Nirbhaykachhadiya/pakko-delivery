import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

// A 45 second Opus recording lands around 150-200 KB once base64 encoded.
// This ceiling keeps a stray long recording from eating the storage quota.
const MAX_VOICE_CHARS = 600_000;

export async function POST(req) {
  const auth = await requireRole('admin');
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { orderId, isUrgent, urgentNote, voiceNote, voiceNoteSec } = await req.json();

  const order = await prisma.order.findUnique({ where: { id: Number(orderId) } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Turning urgent off clears everything attached to it
  if (!isUrgent) {
    const cleared = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        isUrgent: false,
        urgentNote: null,
        voiceNote: null,
        voiceNoteSec: null,
        urgentAt: null,
        urgentBy: null,
      },
    });
    return NextResponse.json({ ok: true, order: cleared });
  }

  if (!urgentNote?.trim() && !voiceNote) {
    return NextResponse.json(
      { error: 'Add a message or a voice note so the rider knows what to do' },
      { status: 400 }
    );
  }

  if (voiceNote && voiceNote.length > MAX_VOICE_CHARS) {
    return NextResponse.json(
      { error: 'That recording is too long. Keep it under 45 seconds.' },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id: Number(orderId) },
    data: {
      isUrgent: true,
      urgentNote: urgentNote?.trim() || null,
      voiceNote: voiceNote || null,
      voiceNoteSec: voiceNote ? Number(voiceNoteSec) || null : null,
      urgentAt: new Date(),
      urgentBy: auth.user.name,
    },
  });

  return NextResponse.json({ ok: true, order: updated });
}
