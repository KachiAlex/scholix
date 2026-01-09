import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { getSchoolIdForUser } from '@/lib/tenant';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

function validateTemplatePayload(payload: any) {
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    throw new Error('BAD_REQUEST: name is required');
  }

  const weights = payload?.weights;
  if (!weights || typeof weights !== 'object' || Array.isArray(weights) || Object.keys(weights).length === 0) {
    throw new Error('BAD_REQUEST: weights must be a non-empty object');
  }
  if (Object.values(weights).some((val) => typeof val !== 'number' || Number.isNaN(val))) {
    throw new Error('BAD_REQUEST: weights must map to numeric values');
  }

  const gradingBands = payload?.gradingBands;
  if (!gradingBands || typeof gradingBands !== 'object' || Array.isArray(gradingBands)) {
    throw new Error('BAD_REQUEST: gradingBands must be an object');
  }

  return {
    name,
    weights: weights as Record<string, number>,
    gradingBands: gradingBands as Record<string, unknown>,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const templates = await prisma.resultTemplate.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireUser(req);
    const schoolId = await getSchoolIdForUser(userId);
    const body = await req.json().catch(() => null);
    const data = validateTemplatePayload(body);

    const created = await prisma.resultTemplate.create({
      data: {
        schoolId,
        name: data.name,
        weights: data.weights as Prisma.JsonObject,
        gradingBands: data.gradingBands as Prisma.JsonObject,
      },
    });
    return NextResponse.json(created);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
