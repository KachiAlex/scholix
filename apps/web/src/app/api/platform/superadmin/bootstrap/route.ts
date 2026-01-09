import { NextResponse, type NextRequest } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { mapErrorToResponse } from '@/lib/http';

export const runtime = 'nodejs';

type BootstrapBody = {
  email?: unknown;
  password?: unknown;
  setupKey?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as BootstrapBody | null;

    const emailRaw = body?.email;
    const passwordRaw = body?.password;
    const setupKeyRaw = body?.setupKey;

    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    const password = typeof passwordRaw === 'string' ? passwordRaw : '';

    if (!email || !password) {
      return NextResponse.json({ message: 'email and password are required' }, { status: 400 });
    }

    const envKey = process.env.SUPERADMIN_SETUP_KEY;
    if (!envKey) {
      return NextResponse.json({ message: 'superadmin setup is not enabled' }, { status: 400 });
    }

    const headerKey = req.headers.get('x-setup-key');
    const providedKey = typeof setupKeyRaw === 'string' ? setupKeyRaw : headerKey;
    if (!providedKey || providedKey !== envKey) {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'email already in use' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
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

      return createdUser;
    });

    const roles = ['SUPERADMIN'];
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const accessToken = jwt.sign({ sub: user.id, email: user.email, roles }, secret, { expiresIn: '12h' });

    return NextResponse.json({
      user: { id: user.id, email: user.email, roles },
      accessToken,
    });
  } catch (err) {
    console.error('SUPERADMIN_BOOTSTRAP_ERROR', err);
    return mapErrorToResponse(err);
  }
}
