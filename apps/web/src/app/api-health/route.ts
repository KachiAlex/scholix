import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/health`, { cache: 'no-store' });
  const json = await res.json();
  return NextResponse.json(json);
}
