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

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { activeSession: true, activeTerm: true },
    });

    if (!school) {
      throw new Error('NOT_FOUND');
    }

    return NextResponse.json({
      schoolId: school.id,
      activeSessionId: school.activeSessionId,
      activeTermId: school.activeTermId,
      activeSession: school.activeSession,
      activeTerm: school.activeTerm,
    });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const body = await req.json().catch(() => ({}));

    const sessionId = Object.prototype.hasOwnProperty.call(body, 'sessionId') ? body.sessionId : undefined;
    const termId = Object.prototype.hasOwnProperty.call(body, 'termId') ? body.termId : undefined;

    if (sessionId === undefined && termId === undefined) {
      throw new Error('BAD_REQUEST: provide sessionId or termId');
    }

    if (sessionId !== undefined && sessionId !== null) {
      const session = await prisma.academicSession.findUnique({ where: { id: sessionId } });
      if (!session) {
        throw new Error('NOT_FOUND: session');
      }
      if (session.schoolId !== schoolId) {
        throw new Error('FORBIDDEN');
      }
    }

    if (termId !== undefined && termId !== null) {
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: { session: true },
      });
      if (!term) {
        throw new Error('NOT_FOUND: term');
      }
      if (term.session.schoolId !== schoolId) {
        throw new Error('FORBIDDEN');
      }
      if (sessionId && term.sessionId !== sessionId) {
        throw new Error('BAD_REQUEST: term not in session');
      }
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(sessionId !== undefined ? { activeSessionId: sessionId } : {}),
        ...(termId !== undefined ? { activeTermId: termId } : {}),
      },
      include: { activeSession: true, activeTerm: true },
    });

    return NextResponse.json({
      schoolId: updated.id,
      activeSessionId: updated.activeSessionId,
      activeTermId: updated.activeTermId,
      activeSession: updated.activeSession,
      activeTerm: updated.activeTerm,
    });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
