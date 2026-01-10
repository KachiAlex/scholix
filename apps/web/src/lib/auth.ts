import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
};

export function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function requireUser(req: NextRequest): { userId: string; email: string; roles: string[] } {
  const token = getBearerToken(req);
  if (!token) throw new Error('UNAUTHORIZED');

  const secret = process.env.JWT_SECRET ?? 'dev-secret';
  const decoded = jwt.verify(token, secret) as JwtPayload;

  return {
    userId: decoded.sub,
    email: decoded.email,
    roles: decoded.roles ?? [],
  };
}

export function requireSuperadmin(req: NextRequest): { userId: string; email: string; roles: string[] } {
  const user = requireUser(req);
  if (!user.roles.includes('SUPERADMIN')) throw new Error('FORBIDDEN');
  return user;
}
