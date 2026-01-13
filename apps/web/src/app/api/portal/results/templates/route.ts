import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';
import { resolveTenantAdminSchool } from '../_helpers';

export const runtime = 'nodejs';

type CreateTemplateBody = {
  name?: unknown;
  description?: unknown;
  gradingConfig?: unknown;
};

export async function GET(req: NextRequest) {
  try {
    const authUser = requireUser(req);
    const { schoolId } = await resolveTenantAdminSchool(authUser.userId);

    const templates = await prisma.resultTemplate.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = requireUser(req);
    const { schoolId } = await resolveTenantAdminSchool(authUser.userId);
    const body = (await req.json().catch(() => ({}))) as CreateTemplateBody;

    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    if (!rawName) {
      throw new Error('BAD_REQUEST: name is required');
    }

    const description =
      body.description === null ? null : typeof body.description === 'string' ? body.description.trim() || null : undefined;

    const template = await prisma.resultTemplate.create({
      data: {
        schoolId,
        name: rawName,
        description: description ?? null,
        gradingConfig: body.gradingConfig ?? undefined,
        createdById: authUser.userId,
        updatedById: authUser.userId,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
