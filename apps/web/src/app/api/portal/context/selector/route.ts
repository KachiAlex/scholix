'use server';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma, TenantRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type SelectorPayload = {
  schoolId?: string;
  sessionId?: string;
  termId?: string;
};

export async function PATCH(req: NextRequest) {
  try {
    const authUser = requireUser(req);
    const payload = (await req.json().catch(() => ({}))) as SelectorPayload;

    if (!payload.schoolId && !payload.sessionId && !payload.termId) {
      throw new Error('BAD_REQUEST: No selector changes provided');
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        memberships: {
          select: {
            schoolId: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('UNAUTHORIZED');
    }

    const membershipMap = new Map<string, TenantRole>();
    for (const membership of user.memberships) {
      membershipMap.set(membership.schoolId, membership.role);
    }

    if (membershipMap.size === 0) {
      throw new Error('BAD_REQUEST: User has no tenant memberships');
    }

    const updates: Prisma.UserUpdateInput = {};

    const resolveMembership = (schoolId: string) => {
      if (!membershipMap.has(schoolId)) {
        throw new Error('FORBIDDEN: not a member of target school');
      }
    };

    let targetSchoolId =
      payload.schoolId ??
      payload.sessionId ??
      payload.termId ??
      user.activeSchoolId ??
      user.memberships[0]?.schoolId ??
      null;

    if (payload.schoolId) {
      resolveMembership(payload.schoolId);
      targetSchoolId = payload.schoolId;
      updates.activeSchoolId = payload.schoolId;
      updates.activeSessionId = null;
      updates.activeTermId = null;
    }

    if (payload.sessionId) {
      const session = await prisma.academicSession.findUnique({
        where: { id: payload.sessionId },
        select: { id: true, schoolId: true },
      });
      if (!session) {
        throw new Error('NOT_FOUND');
      }
      resolveMembership(session.schoolId);
      targetSchoolId = session.schoolId;
      updates.activeSchoolId = session.schoolId;
      updates.activeSessionId = session.id;
      updates.activeTermId = null;
    }

    if (payload.termId) {
      const term = await prisma.term.findUnique({
        where: { id: payload.termId },
        select: { id: true, session: { select: { id: true, schoolId: true } } },
      });
      if (!term) {
        throw new Error('NOT_FOUND');
      }
      resolveMembership(term.session.schoolId);
      targetSchoolId = term.session.schoolId;
      updates.activeSchoolId = term.session.schoolId;
      updates.activeSessionId = term.session.id;
      updates.activeTermId = term.id;
    }

    if (!targetSchoolId) {
      throw new Error('BAD_REQUEST: Unable to resolve target school');
    }

    await prisma.user.update({
      where: { id: authUser.userId },
      data: updates,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return mapErrorToResponse(error);
  }
}
