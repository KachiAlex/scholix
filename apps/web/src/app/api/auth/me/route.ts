import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = requireUser(req);
    return NextResponse.json(user);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}
