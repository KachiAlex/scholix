import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma, ResultDraftStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

function assertPayloadObject(payload: any) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('BAD_REQUEST: payload must be a JSON object');
  }
}

function applyStatusTransition(status: ResultDraftStatus, draft: { lockedAt: Date | null; publishedAt: Date | null }) {
  const now = new Date();
  if (status === ResultDraftStatus.DRAFT) {
    return { status, lockedAt: null, publishedAt: null };
  }
  if (status === ResultDraftStatus.LOCKED) {
    return { status, lockedAt: now, publishedAt: null };
  }
  return { status: ResultDraftStatus.PUBLISHED, lockedAt: draft.lockedAt ?? now, publishedAt: now };
}

async function findDraftOrThrow(draftId: string, schoolId: string) {
  const draft = await prisma.studentResultDraft.findUnique({
    where: { id: draftId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentNo: true } },
      session: { select: { id: true, name: true } },
      term: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  });
  if (!draft || draft.schoolId !== schoolId) {
    throw new Error('NOT_FOUND');
  }
  return draft;
}

export async function GET(req: NextRequest, { params }: { params: { draftId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const draft = await findDraftOrThrow(params.draftId, schoolId);
    return NextResponse.json(draft);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { draftId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const draft = await findDraftOrThrow(params.draftId, schoolId);
    const body = await req.json().catch(() => ({}));

    const data: Prisma.StudentResultDraftUpdateInput = {};

    if (body.payload !== undefined) {
      assertPayloadObject(body.payload);
      data.payload = body.payload as Prisma.JsonObject;
    }

    if (body.comments !== undefined) {
      data.comments = body.comments ? String(body.comments).trim() : null;
    }

    if (body.status) {
      if (!Object.values(ResultDraftStatus).includes(body.status as ResultDraftStatus)) {
        throw new Error('BAD_REQUEST: invalid status');
      }
      Object.assign(data, applyStatusTransition(body.status as ResultDraftStatus, draft));
    }

    const updated = await prisma.studentResultDraft.update({
      where: { id: draft.id },
      data,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNo: true } },
        session: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
