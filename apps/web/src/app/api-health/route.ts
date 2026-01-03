import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('http://localhost:4000/health', { cache: 'no-store' });
  const json = await res.json();
  return NextResponse.json(json);
}
