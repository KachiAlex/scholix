import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type QuestionOptionInput = {
  text: string;
  isCorrect: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const body = await req.json().catch(() => null);
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) throw new Error('BAD_REQUEST: text is required');

    const subjectId = typeof body?.subjectId === 'string' ? body.subjectId : undefined;
    const optionsIn = Array.isArray(body?.options) ? body.options : null;
    if (!optionsIn || optionsIn.length < 2) throw new Error('BAD_REQUEST: options must have at least 2 items');

    const options: QuestionOptionInput[] = optionsIn.map((o: any) => ({
      text: typeof o?.text === 'string' ? o.text.trim() : '',
      isCorrect: Boolean(o?.isCorrect),
    }));

    if (options.some((o: QuestionOptionInput) => !o.text)) throw new Error('BAD_REQUEST: option text is required');

    const correctCount = options.filter((o: QuestionOptionInput) => o.isCorrect).length;
    if (correctCount !== 1) throw new Error('BAD_REQUEST: exactly 1 option must be marked correct');

    if (subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) throw new Error('NOT_FOUND');
      if (subject.schoolId !== schoolId) throw new Error('FORBIDDEN');
    }

    const question = await prisma.cbtQuestion.create({
      data: {
        schoolId,
        subjectId: subjectId || undefined,
        text,
        options: { create: options },
      },
      include: { options: true, subject: true },
    });

    return NextResponse.json(question);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const items = await prisma.cbtQuestion.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: { options: true, subject: true },
    });

    return NextResponse.json(items);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
