import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ResultDraftStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';
import { resolveTenantAdminSchool } from '../../_helpers';

type UpdateDraftBody = {
  status?: unknown;
  totalScore?: unknown;
  data?: unknown;
  notes?: unknown;
  publishedAt?: unknown;
};

export async function PATCH(req: NextRequest, ctx: { params: { draftId: string } }) {
  try {
    const authUser = requireUser(req);
    const { schoolId } = await resolveTenantAdminSchool(authUser.userId);
    const draftId = ctx.params.draftId;

    const draft = await prisma.studentResultDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft || draft.schoolId !== schoolId) {
      throw new Error('NOT_FOUND');
    }

    const body = (await req.json().catch(() => ({}))) as UpdateDraftBody;
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !Object.values(ResultDraftStatus).includes(body.status as ResultDraftStatus)) {
        throw new Error('BAD_REQUEST: invalid status');
      }
      data.status = body.status;
      if (body.status === ResultDraftStatus.PUBLISHED) {
        data.publishedAt = typeof body.publishedAt === 'string' ? new Date(body.publishedAt) : new Date();
      }
    }

    if (body.totalScore !== undefined) {
      if (body.totalScore !== null && typeof body.totalScore !== 'number') {
        throw new Error('BAD_REQUEST: totalScore must be numeric');
      }
      data.totalScore = body.totalScore;
    }

    if (body.data !== undefined) {
      data.data = body.data;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes === null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : draft.notes;
    }

    if (body.publishedAt !== undefined && body.status !== ResultDraftStatus.PUBLISHED) {
      data.publishedAt = body.publishedAt === null ? null : new Date(String(body.publishedAt));
    }

    if (Object.keys(data).length === 0) {
      throw new Error('BAD_REQUEST: no updates provided');
    }

    const updated = await prisma.studentResultDraft.update({
      where: { id: draftId },
      data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        template: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
