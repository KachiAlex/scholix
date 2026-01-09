import { prisma } from '@/lib/prisma';

export async function getSchoolIdForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('NOT_FOUND');
  const schoolId = user.activeSchoolId ?? user.primarySchoolId;
  if (!schoolId) throw new Error('BAD_REQUEST: user has no school context; register with schoolName');
  return schoolId;
}
