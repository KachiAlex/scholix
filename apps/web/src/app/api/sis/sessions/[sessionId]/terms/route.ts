import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

async function ensureSessionOwnership(sessionId: string, schoolId: string) {
  const session = await prisma.academicSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new Error('NOT_FOUND');
  }
  if (session.schoolId !== schoolId) {
    throw new Error('FORBIDDEN');
  }
}

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const { sessionId } = params;

    await ensureSessionOwnership(sessionId, schoolId);

    const terms = await prisma.term.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(terms);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const { sessionId } = params;

    await ensureSessionOwnership(sessionId, schoolId);

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      throw new Error('BAD_REQUEST: name is required');
    }

    const term = await prisma.$transaction(async (tx) => {
      const created = await tx.term.create({
        data: {
          sessionId,
          name,
          startsAt: body?.startsAt ? new Date(body.startsAt) : undefined,
          endsAt: body?.endsAt ? new Date(body.endsAt) : undefined,
        },
      });

      const school = await tx.school.findUnique({ where: { id: schoolId } });
      if (school?.activeSessionId === sessionId) {
        await tx.school.update({
          where: { id: schoolId },
          data: { activeTermId: created.id },
        });
      }

      return created;
    });

    return NextResponse.json(term, { status: 201 });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
