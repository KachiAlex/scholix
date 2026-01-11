import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type CreateTenantAdminBody = {
  email?: unknown;
  password?: unknown;
};

type TenantAdminResponse = {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
};

function toAdminResponse(membership: {
  userId: string;
  role: unknown;
  createdAt: Date;
  user: { email: string };
}): TenantAdminResponse {
  return {
    userId: membership.userId,
    email: membership.user.email,
    role: String(membership.role),
    createdAt: membership.createdAt.toISOString(),
  };
}

export async function POST(req: NextRequest, ctx: { params: { tenantId: string } }) {
  try {
    requireSuperadmin(req);
    const tenantId = ctx.params.tenantId;

    const tenant = await prisma.school.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('NOT_FOUND');

    const body = (await req.json().catch(() => null)) as CreateTenantAdminBody | null;
    const emailRaw = body?.email;
    const passwordRaw = body?.password;

    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    const password = typeof passwordRaw === 'string' ? passwordRaw : '';

    if (!email || !password) throw new Error('BAD_REQUEST: email and password are required');

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('BAD_REQUEST: email already in use');

    const passwordHash = await bcrypt.hash(password, 12);

    const membership = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          primarySchoolId: tenantId,
          activeSchoolId: tenantId,
        },
      });

      const role = await tx.role.upsert({
        where: { name: 'ADMIN' },
        create: { name: 'ADMIN' },
        update: {},
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      const createdMembership = await tx.userSchoolMembership.create({
        data: {
          userId: createdUser.id,
          schoolId: tenantId,
          role: 'ADMIN',
        },
        include: { user: { select: { email: true } } },
      });

      return createdMembership;
    });

    return NextResponse.json({ tenantId: tenant.id, tenantName: tenant.name, admin: toAdminResponse(membership) });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function GET(req: NextRequest, ctx: { params: { tenantId: string } }) {
  try {
    requireSuperadmin(req);
    const tenantId = ctx.params.tenantId;

    const members = await prisma.userSchoolMembership.findMany({
      where: {
        schoolId: tenantId,
        role: { in: ['ADMIN', 'OWNER'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json(members.map(toAdminResponse));
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
