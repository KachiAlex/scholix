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
    const code = typeof body?.code === 'string' ? body.code.trim() : undefined;

    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name,
        code: code || undefined,
      },
    });

    return NextResponse.json(subject);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);

    const items = await prisma.subject.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
    return NextResponse.json(items);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
