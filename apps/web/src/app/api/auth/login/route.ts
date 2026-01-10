import { NextResponse, type NextRequest } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: { include: { role: true } } } }>;

async function autoSeedSuperadmin(email: string, password: string): Promise<UserWithRoles | null> {
  const allowAutoSeed = process.env.AUTO_BOOTSTRAP_SUPERADMIN === 'true';
  const defaultEmail = process.env.DEFAULT_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const defaultPassword = process.env.DEFAULT_SUPERADMIN_PASSWORD;

  if (!allowAutoSeed || !defaultEmail || !defaultPassword) {
    return null;
  }

  if (email !== defaultEmail || password !== defaultPassword) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (existing) {
    return existing as UserWithRoles;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const role = await tx.role.upsert({
      where: { name: 'SUPERADMIN' },
      create: { name: 'SUPERADMIN' },
      update: {},
    });

    await tx.userRole.create({
      data: {
        userId: createdUser.id,
        roleId: role.id,
      },
    });

    const userWithRoles = await tx.user.findUnique({
      where: { id: createdUser.id },
      include: { roles: { include: { role: true } } },
    });

    return userWithRoles as UserWithRoles;
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;
    const password = body?.password;

    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!email || typeof password !== 'string' || !password) {
      return NextResponse.json({ message: 'email and password are required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      user = await autoSeedSuperadmin(email, password);
      if (!user) {
        return NextResponse.json({ message: 'invalid credentials' }, { status: 401 });
      }
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
