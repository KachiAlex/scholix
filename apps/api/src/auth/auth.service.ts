import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SystemRole } from './roles.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (!email || !dto.password) {
      throw new BadRequestException('email and password are required');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      let tenantId: string | null = null;

      if (dto.schoolName && dto.schoolName.trim().length > 0) {
        const tenant = await tx.school.create({ data: { name: dto.schoolName.trim() } });
        tenantId = tenant.id;
      }

      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          primarySchoolId: tenantId ?? undefined,
          activeSchoolId: tenantId ?? undefined,
        },
      });

      const role = await tx.role.upsert({
        where: { name: SystemRole.ADMIN },
        create: { name: SystemRole.ADMIN },
        update: {},
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      });

      if (tenantId) {
        await tx.userSchoolMembership.create({
          data: {
            userId: createdUser.id,
            schoolId: tenantId,
            role: TenantRole.OWNER,
          },
        });
      }

      return createdUser;
    });

    const token = await this.signToken(user.id, user.email);

    return {
      user: { id: user.id, email: user.email },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException('invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');

    const roles = user.roles.map((r: { role: { name: string } }) => r.role.name);
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      roles,
    });

    return {
      user: { id: user.id, email: user.email, roles },
      accessToken,
    };
  }

  private async signToken(userId: string, email: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    return this.jwt.signAsync({
      sub: userId,
      email,
      roles: roles.map((r: { role: { name: string } }) => r.role.name),
    });
  }
}
