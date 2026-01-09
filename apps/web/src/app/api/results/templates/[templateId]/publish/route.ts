import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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

    const body = await req.json().catch(() => ({}));
    const published = Boolean(body?.published);

    const updated = await prisma.resultTemplate.update({
      where: { id: params.templateId },
      data: {
        publishedAt: published ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
