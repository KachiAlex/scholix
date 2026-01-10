import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

type CreateTenantBody = {
  name?: unknown;
};

export async function GET(req: NextRequest) {
  try {
    requireSuperadmin(req);

    const tenants = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      select: selectTenantSummary(),
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

    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "School" ("id", "name", "createdAt", "updatedAt")
      VALUES (${id}, ${name}, NOW(), NOW())
    `;

    const tenant = await prisma.school.findUnique({
      where: { id },
      select: selectTenantSummary(),
    });

    if (!tenant) throw new Error('INTERNAL: tenant insert failed');

    return NextResponse.json(tenant);
  } catch (err) {
    console.error('PLATFORM_TENANTS_POST_ERROR', err);
    return mapErrorToResponse(err);
  }
}

function selectTenantSummary() {
  return {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    _count: selectTenantCounts(),
  };
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
