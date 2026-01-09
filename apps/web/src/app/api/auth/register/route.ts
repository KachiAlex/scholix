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
    const schoolName = body?.schoolName;

    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!email || typeof password !== 'string' || !password) {
      return NextResponse.json({ message: 'email and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'email already in use' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      let schoolId: string | null = null;
      let createdSchoolId: string | null = null;

      if (typeof schoolName === 'string' && schoolName.trim().length > 0) {
        const school = await tx.school.create({ data: { name: schoolName.trim() } });
        schoolId = school.id;
        createdSchoolId = school.id;
      }

      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          primarySchoolId: schoolId ?? undefined,
          activeSchoolId: schoolId ?? undefined,
        },
      });

      const role = await tx.role.upsert({
        where: { name: 'ADMIN' },
        create: { name: 'ADMIN' },
        update: {},
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      if (createdSchoolId) {
        await tx.userSchoolMembership.create({
          data: {
            userId: createdUser.id,
            schoolId: createdSchoolId,
            role: 'ADMIN',
          },
        });
      }

      return createdUser;
    });

    const roles = ['ADMIN'];
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const accessToken = jwt.sign({ sub: user.id, email: user.email, roles }, secret, { expiresIn: '12h' });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      accessToken,
    });
  } catch (err) {
    console.error('AUTH_REGISTER_ERROR', err);
    return mapErrorToResponse(err);
  }
}
