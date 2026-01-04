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
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
    const studentNo = typeof body?.studentNo === 'string' ? body.studentNo.trim() : undefined;

    if (!firstName || !lastName) throw new Error('BAD_REQUEST: firstName and lastName are required');

    const student = await prisma.student.create({
      data: {
        schoolId,
        firstName,
        lastName,
        studentNo: studentNo || undefined,
      },
    });

    return NextResponse.json(student);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const items = await prisma.student.findMany({
      where: { schoolId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        parents: { include: { parent: true } },
        enrollments: { include: { class: true, session: true, term: true } },
      },
    });

    return NextResponse.json(items);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
