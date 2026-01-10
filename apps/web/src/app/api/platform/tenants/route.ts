import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type CreateTenantBody = {
  name?: unknown;
};

export async function GET(req: NextRequest) {
  try {
    requireSuperadmin(req);

    const tenants = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: selectTenantCounts(),
      },
    });

    return NextResponse.json(tenants);
  } catch (err) {
    console.error('PLATFORM_TENANTS_GET_ERROR', err);
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireSuperadmin(req);

    const body = (await req.json().catch(() => null)) as CreateTenantBody | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) throw new Error('BAD_REQUEST: name is required');

    const tenant = await prisma.school.create({
      data: { name },
      include: {
        _count: selectTenantCounts(),
      },
    });

    return NextResponse.json(tenant);
  } catch (err) {
    console.error('PLATFORM_TENANTS_POST_ERROR', err);
    return mapErrorToResponse(err);
  }
}

function selectTenantCounts() {
  return {
    select: {
      memberships: true,
      students: true,
      classes: true,
      subjects: true,
    },
  };
}
