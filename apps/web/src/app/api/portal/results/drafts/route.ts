import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ResultDraftStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';
import { resolveTenantAdminSchool } from '../_helpers';

type DraftFilters = {
  templateId?: string;
  status?: ResultDraftStatus;
};

type CreateDraftBody = {
  templateId?: unknown;
  studentId?: unknown;
  termId?: unknown;
  totalScore?: unknown;
  data?: unknown;
  notes?: unknown;
};

export async function GET(req: NextRequest) {
  try {
    const authUser = requireUser(req);
    const { schoolId } = await resolveTenantAdminSchool(authUser.userId);

    const { searchParams } = new URL(req.url);
    const filters: DraftFilters = {};

    const templateId = searchParams.get('templateId');
    if (templateId) {
      filters.templateId = templateId;
    }

    const status = searchParams.get('status');
    if (status && Object.values(ResultDraftStatus).includes(status as ResultDraftStatus)) {
      filters.status = status as ResultDraftStatus;
    }

    const drafts = await prisma.studentResultDraft.findMany({
      where: { schoolId, ...filters },
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        template: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(drafts);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = requireUser(req);
    const { schoolId } = await resolveTenantAdminSchool(authUser.userId);
    const body = (await req.json().catch(() => ({}))) as CreateDraftBody;

    const templateId = typeof body.templateId === 'string' ? body.templateId : '';
    const studentId = typeof body.studentId === 'string' ? body.studentId : '';
    const termId =
      body.termId === null ? null : typeof body.termId === 'string' && body.termId.trim() ? body.termId.trim() : undefined;

    if (!templateId || !studentId) {
      throw new Error('BAD_REQUEST: templateId and studentId are required');
    }

    const [template, student, term] = await Promise.all([
      prisma.resultTemplate.findUnique({ where: { id: templateId } }),
      prisma.student.findUnique({ where: { id: studentId } }),
      termId
        ? prisma.term.findUnique({
            where: { id: termId },
            select: { id: true, name: true, session: { select: { schoolId: true } } },
          })
        : null,
    ]);

    if (!template || template.schoolId !== schoolId) throw new Error('FORBIDDEN');
    if (!student || student.schoolId !== schoolId) throw new Error('FORBIDDEN');
    if (term && term.session.schoolId !== schoolId) throw new Error('FORBIDDEN');

    const draft = await prisma.studentResultDraft.create({
      data: {
        schoolId,
        templateId,
        studentId,
        termId: termId ?? null,
        totalScore: typeof body.totalScore === 'number' ? body.totalScore : null,
        data: body.data ?? undefined,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        template: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(draft, { status: 201 });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
