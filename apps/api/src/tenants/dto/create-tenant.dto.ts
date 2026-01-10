import { TenantRole } from '@prisma/client';

export type CreateTenantDto = {
  name: string;
  ownerUserId?: string;
  ownerRole?: TenantRole;
};
