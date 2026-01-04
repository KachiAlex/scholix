import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest, ctx: { params: { attemptId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const attemptId = ctx.params.attemptId;
    const body = await req.json().catch(() => null);
    const questionId = typeof body?.questionId === 'string' ? body.questionId : '';
    if (!questionId) throw new Error('BAD_REQUEST: questionId is required');

    const selectedOptionId = body?.selectedOptionId === null ? null : typeof body?.selectedOptionId === 'string' ? body.selectedOptionId : undefined;

    const attempt = await prisma.cbtAttempt.findUnique({ where: { id: attemptId }, include: { exam: true } });
    if (!attempt) throw new Error('NOT_FOUND');
    if (attempt.exam.schoolId !== schoolId) throw new Error('FORBIDDEN');
    if (attempt.status !== 'IN_PROGRESS') throw new Error('BAD_REQUEST: attempt is not in progress');

    const examQuestion = await prisma.cbtExamQuestion.findFirst({ where: { examId: attempt.examId, questionId } });
    if (!examQuestion) throw new Error('BAD_REQUEST: question is not part of exam');

    if (selectedOptionId) {
      const option = await prisma.cbtQuestionOption.findUnique({ where: { id: selectedOptionId } });
      if (!option) throw new Error('NOT_FOUND');
      if (option.questionId !== questionId) throw new Error('BAD_REQUEST: option does not belong to question');
    }

    const answer = await prisma.cbtAttemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        selectedOptionId: selectedOptionId || undefined,
      },
      update: {
        selectedOptionId: selectedOptionId === undefined ? undefined : selectedOptionId,
      },
      include: { question: true, selectedOption: true },
    });

    return NextResponse.json(answer);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
