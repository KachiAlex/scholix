import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperadmin } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type UpdateTenantBody = {
  name?: unknown;
  licenseSeats?: unknown;
  licenseExpiresAt?: unknown;
  licenseNotes?: unknown;
  isSuspended?: unknown;
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
        _count: selectTenantCounts(),
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
    if (!body || typeof body !== 'object') throw new Error('BAD_REQUEST: invalid payload');

    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (!trimmed) throw new Error('BAD_REQUEST: name cannot be empty');
      data.name = trimmed;
    }

    if (body.licenseSeats !== undefined) {
      const seats = Number(body.licenseSeats);
      if (!Number.isFinite(seats) || !Number.isInteger(seats) || seats <= 0) {
        throw new Error('BAD_REQUEST: licenseSeats must be a positive integer');
      }
      data.licenseSeats = seats;
    }

    if (body.licenseExpiresAt !== undefined) {
      if (body.licenseExpiresAt === null || body.licenseExpiresAt === '') {
        data.licenseExpiresAt = null;
      } else if (typeof body.licenseExpiresAt === 'string') {
        const parsed = new Date(body.licenseExpiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new Error('BAD_REQUEST: licenseExpiresAt must be an ISO date string');
        }
        data.licenseExpiresAt = parsed;
      } else {
        throw new Error('BAD_REQUEST: licenseExpiresAt must be a string or null');
      }
    }

    if (body.licenseNotes !== undefined) {
      if (body.licenseNotes === null) {
        data.licenseNotes = null;
      } else if (typeof body.licenseNotes === 'string') {
        data.licenseNotes = body.licenseNotes.trim() || null;
      } else {
        throw new Error('BAD_REQUEST: licenseNotes must be a string or null');
      }
    }

    if (body.isSuspended !== undefined) {
      data.isSuspended = Boolean(body.isSuspended);
    }

    if (Object.keys(data).length === 0) {
      throw new Error('BAD_REQUEST: no updates provided');
    }

    const tenant = await prisma.school.update({
      where: { id: tenantId },
      data,
      include: {
        _count: selectTenantCounts(),
      },
    });

    return NextResponse.json(tenant);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { tenantId: string } }) {
  try {
    requireSuperadmin(req);
    const tenantId = ctx.params.tenantId;

    await prisma.school.delete({
      where: { id: tenantId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
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
