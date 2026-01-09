import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const drafts = await prisma.studentResultDraft.findMany({
      where: { schoolId },
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNo: true } },
        session: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(drafts);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const body = await req.json().catch(() => null);

    if (!body?.studentId) {
      throw new Error('BAD_REQUEST: studentId is required');
    }

    assertPayloadObject(body?.payload);

    const student = await prisma.student.findUnique({
      where: { id: body.studentId },
      include: { school: { select: { id: true, activeSessionId: true, activeTermId: true } } },
    });
    if (!student || student.schoolId !== schoolId) {
      throw new Error('NOT_FOUND');
    }

    let templateId: string | null = null;
    if (body.templateId) {
      const template = await prisma.resultTemplate.findUnique({ where: { id: body.templateId } });
      if (!template || template.schoolId !== schoolId) {
        throw new Error('BAD_REQUEST: template not found for school');
      }
      templateId = template.id;
    }

    const sessionId = body.sessionId ?? student.school?.activeSessionId ?? null;
    const termId = body.termId ?? student.school?.activeTermId ?? null;

    if (!sessionId) {
      throw new Error('BAD_REQUEST: sessionId is required (configure active session)');
    }

    const draft = await prisma.studentResultDraft.create({
      data: {
        schoolId,
        studentId: body.studentId,
        sessionId,
        termId,
        templateId,
        payload: body.payload as Prisma.JsonObject,
        comments: body.comments?.trim() ?? null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNo: true } },
        session: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(draft);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
