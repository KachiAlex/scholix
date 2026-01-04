import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, ctx: { params: { attemptId: string } }) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const attemptId = ctx.params.attemptId;

    const attempt = await prisma.cbtAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });
    if (!attempt) throw new Error('NOT_FOUND');
    if (attempt.exam.schoolId !== schoolId) throw new Error('FORBIDDEN');
    if (attempt.status !== 'IN_PROGRESS') throw new Error('BAD_REQUEST: attempt is not in progress');

    const updated = await prisma.cbtAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        answers: { include: { question: true, selectedOption: true } },
        exam: true,
        student: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
