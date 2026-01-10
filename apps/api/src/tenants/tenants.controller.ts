import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SystemRole } from '../auth/roles.constants';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { SetActiveTenantDto } from './dto/set-active-tenant.dto';
import { UpdateTenantMembershipDto } from './dto/update-membership.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpsertTenantMembershipDto } from './dto/upsert-membership.dto';
import { TenantsService } from './tenants.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.SUPERADMIN)
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  listTenants() {
    return this.tenants.listTenants();
  }

  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenants.createTenant(dto);
  }

  @Get(':tenantId')
  getTenant(@Param('tenantId') tenantId: string) {
    return this.tenants.getTenantById(tenantId);
  }

  @Patch(':tenantId')
  updateTenant(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.updateTenant(tenantId, dto);
  }

  @Delete(':tenantId')
  deleteTenant(@Param('tenantId') tenantId: string) {
    return this.tenants.deleteTenant(tenantId);
  }

  @Get(':tenantId/members')
  listTenantMembers(@Param('tenantId') tenantId: string) {
    return this.tenants.listTenantMembers(tenantId);
  }

  @Post(':tenantId/members')
  upsertMembership(@Param('tenantId') tenantId: string, @Body() dto: UpsertTenantMembershipDto) {
    return this.tenants.upsertMembership({
      ...dto,
      schoolId: tenantId,
    });
  }

  @Patch(':tenantId/members/:userId')
  updateMembership(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateTenantMembershipDto,
  ) {
    return this.tenants.updateMembership(userId, tenantId, dto);
  }

  @Delete(':tenantId/members/:userId')
  removeMembership(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.tenants.removeMembership(userId, tenantId);
  }

  @Get('users/:userId')
  listUserMemberships(@Param('userId') userId: string) {
    return this.tenants.listUserMemberships(userId);
  }

  @Patch('users/:userId/active')
  setActiveTenant(@Param('userId') userId: string, @Body() dto: SetActiveTenantDto) {
    return this.tenants.setActiveTenant(userId, dto.schoolId);
  }
}
