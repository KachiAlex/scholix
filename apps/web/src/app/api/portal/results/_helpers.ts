import { TenantRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSchoolIdForUser } from '@/lib/tenant';

export async function resolveTenantAdminSchool(userId: string) {
  const schoolId = await getSchoolIdForUser(userId);

  const membership = await prisma.userSchoolMembership.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
    select: { role: true },
  });

  if (!membership) {
    throw new Error('FORBIDDEN');
  }

  if (membership.role !== TenantRole.ADMIN && membership.role !== TenantRole.OWNER) {
    throw new Error('FORBIDDEN');
  }

  return { schoolId, role: membership.role };
}
