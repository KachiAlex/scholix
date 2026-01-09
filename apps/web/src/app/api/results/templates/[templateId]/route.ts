import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: { templateId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const template = await prisma.resultTemplate.findUnique({ where: { id: params.templateId } });
    if (!template || template.schoolId !== schoolId) {
      return NextResponse.json({ message: 'result template not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const data: Prisma.ResultTemplateUpdateInput = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return NextResponse.json({ message: 'name is required' }, { status: 400 });
      }
      data.name = name;
    }

    if (body?.weights !== undefined) {
      if (!body.weights || typeof body.weights !== 'object' || Array.isArray(body.weights)) {
        return NextResponse.json({ message: 'weights must be an object' }, { status: 400 });
      }
      if (Object.values(body.weights).some((val) => typeof val !== 'number' || Number.isNaN(val))) {
        return NextResponse.json({ message: 'weights must map to numeric values' }, { status: 400 });
      }
      data.weights = body.weights as Prisma.JsonObject;
    }

    if (body?.gradingBands !== undefined) {
      if (!body.gradingBands || typeof body.gradingBands !== 'object' || Array.isArray(body.gradingBands)) {
        return NextResponse.json({ message: 'gradingBands must be an object' }, { status: 400 });
      }
      data.gradingBands = body.gradingBands as Prisma.JsonObject;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'no fields to update' }, { status: 400 });
    }

    const updated = await prisma.resultTemplate.update({
      where: { id: params.templateId },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
