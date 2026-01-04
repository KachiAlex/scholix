import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const body = await req.json().catch(() => null);

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) throw new Error('BAD_REQUEST: name is required');

    const classId = typeof body?.classId === 'string' ? body.classId : '';
    if (!classId) throw new Error('BAD_REQUEST: classId is required');

    const durationMinutes = Number(body?.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new Error('BAD_REQUEST: durationMinutes must be a positive number');
    }

    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId : undefined;
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
    const termId = typeof body?.termId === 'string' ? body.termId : undefined;

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new Error('NOT_FOUND');
    if (cls.schoolId !== schoolId) throw new Error('FORBIDDEN');

    if (subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) throw new Error('NOT_FOUND');
      if (subject.schoolId !== schoolId) throw new Error('FORBIDDEN');
    }

    if (sessionId) {
      const session = await prisma.academicSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error('NOT_FOUND');
      if (session.schoolId !== schoolId) throw new Error('FORBIDDEN');
    }

    if (termId) {
      const term = await prisma.term.findUnique({ where: { id: termId } });
      if (!term) throw new Error('NOT_FOUND');

      const termSession = await prisma.academicSession.findUnique({ where: { id: term.sessionId } });
      if (!termSession) throw new Error('NOT_FOUND');
      if (termSession.schoolId !== schoolId) throw new Error('FORBIDDEN');

      if (sessionId && term.sessionId !== sessionId) {
        throw new Error('BAD_REQUEST: term does not belong to session');
      }
    }

    const startsAt = typeof body?.startsAt === 'string' ? new Date(body.startsAt) : undefined;
    const endsAt = typeof body?.endsAt === 'string' ? new Date(body.endsAt) : undefined;
    if (startsAt && isNaN(startsAt.getTime())) throw new Error('BAD_REQUEST: startsAt is invalid');
    if (endsAt && isNaN(endsAt.getTime())) throw new Error('BAD_REQUEST: endsAt is invalid');

    const questionIds = Array.isArray(body?.questionIds) ? body.questionIds.filter((x: any) => typeof x === 'string') : [];
    if (questionIds.length > 0) {
      const count = await prisma.cbtQuestion.count({ where: { id: { in: questionIds }, schoolId } });
      if (count !== questionIds.length) throw new Error('BAD_REQUEST: one or more questionIds are invalid');
    }

    const created = await prisma.$transaction(async (tx) => {
      const exam = await tx.cbtExam.create({
        data: {
          schoolId,
          name,
          classId,
          subjectId: subjectId || undefined,
          sessionId: sessionId || undefined,
          termId: termId || undefined,
          durationMinutes,
          startsAt,
          endsAt,
        },
      });

      if (questionIds.length > 0) {
        await tx.cbtExamQuestion.createMany({
          data: questionIds.map((qid: string, idx: number) => ({
            examId: exam.id,
            questionId: qid,
            order: idx + 1,
          })),
          skipDuplicates: true,
        });
      }

      return tx.cbtExam.findUnique({
        where: { id: exam.id },
        include: {
          class: true,
          subject: true,
          session: true,
          term: true,
          questions: { include: { question: { include: { options: true } } }, orderBy: { order: 'asc' } },
        },
      });
    });

    return NextResponse.json(created);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const items = await prisma.cbtExam.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        class: true,
        subject: true,
        session: true,
        term: true,
        questions: { include: { question: true }, orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(items);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
