export type UpsertTenantMembershipDto = {
  userId: string;
  role?: string;
  makePrimary?: boolean;
  makeActive?: boolean;
};
