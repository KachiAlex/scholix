import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const sessions = await prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: { terms: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json(sessions);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) throw new Error('BAD_REQUEST: name is required');
    const shouldActivate = Boolean(body?.isActive);

    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.academicSession.create({
        data: {
          schoolId,
          name,
          isActive: shouldActivate,
        },
      });

      if (shouldActivate) {
        await tx.academicSession.updateMany({
          where: {
            schoolId,
            id: { not: created.id },
          },
          data: { isActive: false },
        });

        await tx.school.update({
          where: { id: schoolId },
          data: {
            activeSessionId: created.id,
            activeTermId: null,
          },
        });
      }

      return created;
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
