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
        activeSchool: { select: { id: true, name: true } },
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
          tenantRole: null,
          systemRoles: authUser.roles ?? [],
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      school: {
        id: activeMembership.school.id,
        name: activeMembership.school.name,
      },
      tenantRole: String(activeMembership.role),
      systemRoles: authUser.roles ?? [],
    });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
