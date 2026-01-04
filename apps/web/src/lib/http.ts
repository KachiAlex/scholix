import { NextResponse } from 'next/server';

export function jsonOk(data: any, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...(init ?? {}) });
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export function mapErrorToResponse(err: unknown) {
  if (err instanceof Error && err.message === 'UNAUTHORIZED') {
    return jsonError('unauthorized', 401);
  }
  if (err instanceof Error && err.message === 'FORBIDDEN') {
    return jsonError('forbidden', 403);
  }
  if (err instanceof Error && err.message === 'NOT_FOUND') {
    return jsonError('not found', 404);
  }
  if (err instanceof Error && err.message.startsWith('BAD_REQUEST:')) {
    return jsonError(err.message.replace('BAD_REQUEST:', '').trim(), 400);
  }
  return jsonError('internal server error', 500);
}
