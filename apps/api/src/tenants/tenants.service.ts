import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantRole, User } from '@prisma/client';
import { SystemRole } from '../auth/roles.constants';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const TENANT_ROLE_VALUES = Object.values(TenantRole);

type TenantRoleValue = TenantRole | string | null | undefined;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    return this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: { user: { select: { id: true, email: true, createdAt: true, updatedAt: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: this.selectTenantCounts(),
      },
    });
  }

  async getTenantById(tenantId: string) {
    return this.ensureTenant(tenantId);
  }

  async createTenant(dto: { name: string; ownerUserId?: string; ownerRole?: TenantRoleValue }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.school.create({ data: { name } });

      if (dto.ownerUserId) {
        const owner = await tx.user.findUnique({ where: { id: dto.ownerUserId } });
        if (!owner) throw new NotFoundException('owner user not found');

        const role = this.resolveTenantRole(dto.ownerRole) ?? TenantRole.OWNER;

        await tx.userSchoolMembership.upsert({
          where: { userId_schoolId: { userId: owner.id, schoolId: tenant.id } },
          update: { role },
          create: { userId: owner.id, schoolId: tenant.id, role },
        });

        await this.ensureSystemRoleAssignment(tx, owner.id, SystemRole.ADMIN);

        await tx.user.update({
          where: { id: owner.id },
          data: this.buildUserTenantContext(owner, tenant.id, {
            makePrimary: true,
            makeActive: true,
          }),
        });
      }

      return tenant;
    });
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
    const payload: Prisma.SchoolUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) throw new BadRequestException('name cannot be empty');
      payload.name = trimmed;
    }

    if (dto.licenseSeats !== undefined) {
      payload.licenseSeats = dto.licenseSeats;
    }

    if (dto.licenseExpiresAt !== undefined) {
      payload.licenseExpiresAt = dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : null;
    }

    if (dto.licenseNotes !== undefined) {
      payload.licenseNotes = dto.licenseNotes ? dto.licenseNotes.trim() : null;
    }

    if (dto.isSuspended !== undefined) {
      payload.isSuspended = dto.isSuspended;
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('no updates provided');
    }

    await this.ensureTenant(tenantId);

    return this.prisma.school.update({
      where: { id: tenantId },
      data: payload,
      include: {
        memberships: {
          include: { user: { select: { id: true, email: true, createdAt: true, updatedAt: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: this.selectTenantCounts(),
      },
    });
  }

  async deleteTenant(tenantId: string) {
    await this.ensureTenant(tenantId);
    return this.prisma.school.delete({ where: { id: tenantId } });
  }

  async listTenantMembers(tenantId: string) {
    await this.ensureTenant(tenantId);
    return this.prisma.userSchoolMembership.findMany({
      where: { schoolId: tenantId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listUserMemberships(userId: string) {
    await this.ensureUser(userId);
    return this.prisma.userSchoolMembership.findMany({
      where: { userId },
      include: { school: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertMembership(dto: {
    userId: string;
    schoolId: string;
    role?: TenantRoleValue;
    makePrimary?: boolean;
    makeActive?: boolean;
  }) {
    const [user, tenant] = await Promise.all([this.ensureUser(dto.userId), this.ensureTenant(dto.schoolId)]);
    const role = this.resolveTenantRole(dto.role) ?? TenantRole.ADMIN;

    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.userSchoolMembership.upsert({
        where: { userId_schoolId: { userId: user.id, schoolId: tenant.id } },
        update: { role },
        create: { userId: user.id, schoolId: tenant.id, role },
        include: { school: true, user: true },
      });

      if (dto.makePrimary || dto.makeActive || !user.primarySchoolId || !user.activeSchoolId) {
        await tx.user.update({
          where: { id: user.id },
          data: this.buildUserTenantContext(user, tenant.id, {
            makePrimary: dto.makePrimary ?? (!user.primarySchoolId && dto.makePrimary !== false),
            makeActive: dto.makeActive ?? (!user.activeSchoolId && dto.makeActive !== false),
          }),
        });
      }

      return membership;
    });
  }

  async updateMembership(
    userId: string,
    schoolId: string,
    dto: { role?: TenantRoleValue; makePrimary?: boolean; makeActive?: boolean },
  ) {
    const user = await this.ensureUser(userId);
    await this.ensureTenant(schoolId);

    const membership = await this.prisma.userSchoolMembership.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
      include: { school: true, user: true },
    });
    if (!membership) throw new NotFoundException('membership not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.userSchoolMembership.update({
        where: { userId_schoolId: { userId, schoolId } },
        data: { role: this.resolveTenantRole(dto.role) ?? undefined },
        include: { school: true, user: true },
      });

      if (dto.makePrimary || dto.makeActive) {
        await tx.user.update({
          where: { id: user.id },
          data: this.buildUserTenantContext(user, schoolId, {
            makePrimary: dto.makePrimary ?? false,
            makeActive: dto.makeActive ?? false,
          }),
        });
      }

      return updated;
    });
  }

  async removeMembership(userId: string, schoolId: string) {
    const membership = await this.prisma.userSchoolMembership.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
    });
    if (!membership) throw new NotFoundException('membership not found');

    await this.prisma.userSchoolMembership.delete({
      where: { userId_schoolId: { userId, schoolId } },
    });
  }

  async setActiveTenant(userId: string, schoolId: string) {
    const membership = await this.prisma.userSchoolMembership.findUnique({
      where: { userId_schoolId: { userId, schoolId } },
    });
    if (!membership) throw new BadRequestException('user is not a member of this tenant');

    return this.prisma.user.update({
      where: { id: userId },
      data: { activeSchoolId: schoolId },
    });
  }

  private async ensureTenant(id: string) {
    const tenant = await this.prisma.school.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, email: true, createdAt: true, updatedAt: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: this.selectTenantCounts(),
      },
    });
    if (!tenant) throw new NotFoundException('tenant not found');
    return tenant;
  }

  private async ensureUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  private resolveTenantRole(role: TenantRoleValue): TenantRole | undefined {
    if (!role) return undefined;
    if (TENANT_ROLE_VALUES.includes(role as TenantRole)) return role as TenantRole;
    const normalized = String(role).toUpperCase().trim();
    return TENANT_ROLE_VALUES.find((value) => value === normalized) as TenantRole | undefined;
  }

  private buildUserTenantContext(
    user: User,
    schoolId: string,
    flags: { makePrimary?: boolean; makeActive?: boolean },
  ): Prisma.UserUncheckedUpdateInput {
    return {
      primarySchoolId: flags.makePrimary ? schoolId : user.primarySchoolId ?? undefined,
      activeSchoolId: flags.makeActive ? schoolId : user.activeSchoolId ?? undefined,
    };
  }

  private async ensureSystemRoleAssignment(tx: Prisma.TransactionClient, userId: string, role: SystemRole) {
    const systemRole = await tx.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId, roleId: systemRole.id } },
      update: {},
      create: { userId, roleId: systemRole.id },
    });
  }

  private selectTenantCounts(): Prisma.SchoolCountOutputTypeDefaultArgs {
    return {
      select: {
      memberships: true,
      students: true,
      classes: true,
      subjects: true,
      },
    };
  }
}
