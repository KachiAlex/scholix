import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AuditSeverity } from '@prisma/client';
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
        activeSessionId: true,
        activeTermId: true,
        activeSchool: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            tagline: true,
            shortCode: true,
            location: true,
          },
        },
        memberships: {
          select: {
            schoolId: true,
            role: true,
            school: { select: { id: true, name: true } },
          },
        },
        activeSession: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        activeTerm: {
          select: {
            id: true,
            name: true,
            startsAt: true,
            endsAt: true,
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
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        tagline: true,
        shortCode: true,
        location: true,
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
        featureFlags: {
          select: { id: true, slug: true, isEnabled: true, config: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        _count: {
          select: {
            auditLogs: {
              where: {
                acknowledgedAt: null,
                severity: { in: [AuditSeverity.WARNING, AuditSeverity.ALERT] },
              },
            },
          },
        },
      },
    });

    const sessions = school?.sessions ?? [];
    const activeSession =
      sessions.find((session) => session.id === (user.activeSessionId ?? school?.activeSessionId)) ?? sessions[0] ?? null;
    const activeTerm =
      activeSession?.terms.find((term) => term.id === (user.activeTermId ?? school?.activeTermId)) ?? activeSession?.terms[0] ?? null;

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      systemRoles: authUser.roles ?? [],
      memberships: user.memberships.map((membership) => ({
        schoolId: membership.schoolId,
        schoolName: membership.school.name,
        tenantRole: String(membership.role),
      })),
      school: school
        ? {
            id: school.id,
            name: school.name,
            logoUrl: school.logoUrl,
            primaryColor: school.primaryColor,
            secondaryColor: school.secondaryColor,
            accentColor: school.accentColor,
            tagline: school.tagline,
            shortCode: school.shortCode,
            location: school.location,
          }
        : null,
      tenantRole: String(activeMembership.role),
      activeSession,
      activeTerm,
      sessions,
      featureFlags: school?.featureFlags ?? [],
      auditSummary: {
        pendingAlerts: school?._count.auditLogs ?? 0,
        lastEventAt: school?.auditLogs[0]?.createdAt ?? null,
      },
    });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
