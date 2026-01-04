import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: { examId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const examId = ctx.params.examId;
    const body = await req.json().catch(() => null);
    const studentId = typeof body?.studentId === 'string' ? body.studentId : '';
    if (!studentId) throw new Error('BAD_REQUEST: studentId is required');

    const exam = await prisma.cbtExam.findUnique({
      where: { id: examId },
      include: {
        questions: { include: { question: { include: { options: true } } }, orderBy: { order: 'asc' } },
      },
    });
    if (!exam) throw new Error('NOT_FOUND');
    if (exam.schoolId !== schoolId) throw new Error('FORBIDDEN');

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('NOT_FOUND');
    if (student.schoolId !== schoolId) throw new Error('FORBIDDEN');

    const attempt = await prisma.cbtAttempt.upsert({
      where: { examId_studentId: { examId, studentId } },
      create: { examId, studentId },
      update: {},
      include: { answers: true },
    });

    const safeExam = {
      id: exam.id,
      schoolId: exam.schoolId,
      name: exam.name,
      classId: exam.classId,
      subjectId: exam.subjectId,
      sessionId: exam.sessionId,
      termId: exam.termId,
      durationMinutes: exam.durationMinutes,
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      questions: exam.questions.map((eq) => ({
        id: eq.id,
        examId: eq.examId,
        questionId: eq.questionId,
        order: eq.order,
        createdAt: eq.createdAt,
        updatedAt: eq.updatedAt,
        question: {
          id: eq.question.id,
          schoolId: eq.question.schoolId,
          subjectId: eq.question.subjectId,
          type: eq.question.type,
          text: eq.question.text,
          createdAt: eq.question.createdAt,
          updatedAt: eq.question.updatedAt,
          options: eq.question.options.map((o) => ({
            id: o.id,
            questionId: o.questionId,
            text: o.text,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
          })),
        },
      })),
    };

    return NextResponse.json({ attempt, exam: safeExam });
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
