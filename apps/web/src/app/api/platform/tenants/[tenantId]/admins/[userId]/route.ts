import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type ResetPasswordBody = {
  password?: unknown;
};

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function ensureTenant(tenantId: string) {
  const tenant = await prisma.school.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('NOT_FOUND');
  return tenant;
}

async function ensureMembership(tenantId: string, userId: string) {
  const membership = await prisma.userSchoolMembership.findUnique({
    where: { userId_schoolId: { userId, schoolId: tenantId } },
  });
  if (!membership) throw new Error('NOT_FOUND');
  return membership;
}

async function ensureNotSuperadmin(userId: string) {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  if (roles.some((r) => r.role.name === 'SUPERADMIN')) {
    throw new Error('BAD_REQUEST: cannot modify superadmin user');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { tenantId: string; userId: string } }) {
  try {
    requireSuperadmin(req);

    const tenantId = normalizeId(ctx.params.tenantId);
    const userId = normalizeId(ctx.params.userId);
    if (!tenantId || !userId) throw new Error('BAD_REQUEST: missing ids');

    await ensureTenant(tenantId);
    await ensureMembership(tenantId, userId);
    await ensureNotSuperadmin(userId);

    const body = (await req.json().catch(() => null)) as ResetPasswordBody | null;
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) throw new Error('BAD_REQUEST: password is required');

    const passwordHash = await bcrypt.hash(password, 12);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { tenantId: string; userId: string } }) {
  try {
    requireSuperadmin(req);

    const tenantId = normalizeId(ctx.params.tenantId);
    const userId = normalizeId(ctx.params.userId);
    if (!tenantId || !userId) throw new Error('BAD_REQUEST: missing ids');

    await ensureTenant(tenantId);
    await ensureMembership(tenantId, userId);
    await ensureNotSuperadmin(userId);

    await prisma.$transaction(async (tx) => {
      await tx.userSchoolMembership.delete({
        where: { userId_schoolId: { userId, schoolId: tenantId } },
      });

      const remainingMemberships = await tx.userSchoolMembership.count({ where: { userId } });
      if (remainingMemberships === 0) {
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
