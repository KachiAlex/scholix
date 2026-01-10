import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type UpdateTenantBody = {
  name?: unknown;
};

export async function GET(req: NextRequest, ctx: { params: { tenantId: string } }) {
  try {
    requireSuperadmin(req);
    const tenantId = ctx.params.tenantId;

    const tenant = await prisma.school.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          include: { user: { select: { id: true, email: true, createdAt: true, updatedAt: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            memberships: true,
            students: true,
            classes: true,
            subjects: true,
          },
        },
      },
    });

    if (!tenant) throw new Error('NOT_FOUND');
    return NextResponse.json(tenant);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { tenantId: string } }) {
  try {
    requireSuperadmin(req);
    const tenantId = ctx.params.tenantId;

    const body = (await req.json().catch(() => null)) as UpdateTenantBody | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) throw new Error('BAD_REQUEST: name is required');

    const tenant = await prisma.school.update({
      where: { id: tenantId },
      data: { name },
    });

    return NextResponse.json(tenant);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
