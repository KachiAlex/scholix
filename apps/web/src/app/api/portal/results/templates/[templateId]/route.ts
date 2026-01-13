import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';
import { resolveTenantAdminSchool } from '../../_helpers';

type UpdateTemplateBody = {
  name?: unknown;
  description?: unknown;
  gradingConfig?: unknown;
  isArchived?: unknown;
};

export async function PATCH(req: NextRequest, ctx: { params: { templateId: string } }) {
  try {
    const authUser = requireUser(req);
    const { schoolId } = await resolveTenantAdminSchool(authUser.userId);
    const templateId = ctx.params.templateId;

    const template = await prisma.resultTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.schoolId !== schoolId) {
      throw new Error('NOT_FOUND');
    }

    const body = (await req.json().catch(() => ({}))) as UpdateTemplateBody;
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        throw new Error('BAD_REQUEST: name cannot be empty');
      }
      data.name = body.name.trim();
    }

    if (body.description !== undefined) {
      data.description =
        body.description === null ? null : typeof body.description === 'string' ? body.description.trim() || null : template.description;
    }

    if (body.gradingConfig !== undefined) {
      data.gradingConfig = body.gradingConfig;
    }

    if (body.isArchived !== undefined) {
      if (typeof body.isArchived !== 'boolean') {
        throw new Error('BAD_REQUEST: isArchived must be boolean');
      }
      data.isArchived = body.isArchived;
    }

    if (Object.keys(data).length === 0) {
      throw new Error('BAD_REQUEST: no updates provided');
    }

    data.updatedById = authUser.userId;

    const updated = await prisma.resultTemplate.update({
      where: { id: templateId },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
