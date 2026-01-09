import { NextResponse, type NextRequest } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;
    const password = body?.password;

    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!email || typeof password !== 'string' || !password) {
      return NextResponse.json({ message: 'email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      return NextResponse.json({ message: 'invalid credentials' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: 'invalid credentials' }, { status: 401 });
    }

    const roles = user.roles.map((r) => r.role.name);
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const accessToken = jwt.sign({ sub: user.id, email: user.email, roles }, secret, { expiresIn: '12h' });

    return NextResponse.json({
      user: { id: user.id, email: user.email, roles },
      accessToken,
    });
  } catch (err) {
    console.error('AUTH_LOGIN_ERROR', err);
    return mapErrorToResponse(err);
  }
}
