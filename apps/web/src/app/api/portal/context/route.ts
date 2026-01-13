import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authUser = requireUser(req);

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        activeSchoolId: true,
        memberships: {
          select: {
            schoolId: true,
            role: true,
            school: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) throw new Error('UNAUTHORIZED');

    const activeMembership =
      (user.activeSchoolId
        ? user.memberships.find((m) => m.schoolId === user.activeSchoolId)
        : undefined) ?? user.memberships[0];

    if (!activeMembership) {
      return NextResponse.json(
        {
          userId: user.id,
          email: user.email,
          school: null,
          memberships: [],
          tenantRole: null,
          systemRoles: authUser.roles ?? [],
          activeSession: null,
          activeTerm: null,
          sessions: [],
          featureFlags: [],
          auditSummary: { pendingAlerts: 0, lastEventAt: null },
        },
        { status: 200 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { id: activeMembership.schoolId },
      select: {
        id: true,
        name: true,
        activeSessionId: true,
        activeTermId: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
            terms: {
              orderBy: { createdAt: 'asc' },
              select: { id: true, name: true, startsAt: true, endsAt: true },
            },
          },
        },
      },
    });

    const sessions = school?.sessions ?? [];
    const activeSession = sessions.find((session) => session.id === school?.activeSessionId) ?? sessions[0] ?? null;
    const activeTerm =
      activeSession?.terms.find((term) => term.id === school?.activeTermId) ?? activeSession?.terms[0] ?? null;

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      systemRoles: authUser.roles ?? [],
      memberships: user.memberships.map((membership) => ({
        schoolId: membership.schoolId,
        schoolName: membership.school?.name ?? 'Unknown school',
        tenantRole: String(membership.role),
      })),
      school: school
        ? {
            id: school.id,
            name: school.name,
            logoUrl: null,
            primaryColor: null,
            secondaryColor: null,
            accentColor: null,
            tagline: null,
            shortCode: null,
            location: null,
          }
        : null,
      tenantRole: String(activeMembership.role),
      activeSession,
      activeTerm,
      sessions,
      featureFlags: [],
      auditSummary: {
        pendingAlerts: 0,
        lastEventAt: null,
      },
    });
  } catch (err) {
    console.error('PORTAL_CONTEXT_ERROR', err);
    return mapErrorToResponse(err);
  }
}
