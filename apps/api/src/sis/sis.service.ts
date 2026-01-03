import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { LinkParentStudentDto } from './dto/link-parent-student.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { SetActiveContextDto } from './dto/set-active-context.dto';

@Injectable()
export class SisService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSchoolIdForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');
    if (!user.schoolId) throw new BadRequestException('user has no schoolId; register with schoolName');
    return user.schoolId;
  }

  async getActiveContext(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        activeSession: true,
        activeTerm: true,
      },
    });
    if (!school) throw new NotFoundException('school not found');

    return {
      schoolId: school.id,
      activeSessionId: school.activeSessionId,
      activeTermId: school.activeTermId,
      activeSession: school.activeSession,
      activeTerm: school.activeTerm,
    };
  }

  async setActiveContext(userId: string, dto: SetActiveContextDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const sessionId = dto.sessionId === null ? null : dto.sessionId;
    const termId = dto.termId === null ? null : dto.termId;

    let session: { id: string; schoolId: string } | null = null;
    if (sessionId) {
      session = await this.prisma.academicSession.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundException('session not found');
      if (session.schoolId !== schoolId) throw new ForbiddenException();
    }

    if (termId) {
      const term = await this.prisma.term.findUnique({ where: { id: termId } });
      if (!term) throw new NotFoundException('term not found');

      const termSession = await this.prisma.academicSession.findUnique({ where: { id: term.sessionId } });
      if (!termSession) throw new NotFoundException('session not found');
      if (termSession.schoolId !== schoolId) throw new ForbiddenException();

      if (sessionId && term.sessionId !== sessionId) {
        throw new BadRequestException('term does not belong to session');
      }
    }

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        activeSessionId: sessionId === undefined ? undefined : sessionId,
        activeTermId: termId === undefined ? undefined : termId,
      },
      include: { activeSession: true, activeTerm: true },
    });

    return {
      schoolId: updated.id,
      activeSessionId: updated.activeSessionId,
      activeTermId: updated.activeTermId,
      activeSession: updated.activeSession,
      activeTerm: updated.activeTerm,
    };
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    const shouldActivate = dto.isActive ?? false;

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.academicSession.create({
        data: {
          schoolId,
          name,
          isActive: shouldActivate,
        },
      });

      if (shouldActivate) {
        await tx.academicSession.updateMany({
          where: {
            schoolId,
            id: { not: session.id },
          },
          data: { isActive: false },
        });

        await tx.school.update({
          where: { id: schoolId },
          data: {
            activeSessionId: session.id,
            activeTermId: null,
          },
        });
      }

      return session;
    });
  }

  async listSessions(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: { terms: true },
    });
  }

  async createTerm(userId: string, sessionId: string, dto: CreateTermDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const session = await this.prisma.academicSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('session not found');
    if (session.schoolId !== schoolId) throw new ForbiddenException();

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    return this.prisma.$transaction(async (tx) => {
      const term = await tx.term.create({
        data: {
          sessionId,
          name,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        },
      });

      const school = await tx.school.findUnique({ where: { id: schoolId } });
      if (school?.activeSessionId === sessionId) {
        await tx.school.update({
          where: { id: schoolId },
          data: { activeTermId: term.id },
        });
      }

      return term;
    });
  }

  async listTerms(userId: string, sessionId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const session = await this.prisma.academicSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('session not found');
    if (session.schoolId !== schoolId) throw new ForbiddenException();

    return this.prisma.term.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createClass(userId: string, dto: CreateClassDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    return this.prisma.class.create({
      data: {
        schoolId,
        name,
      },
    });
  }

  async listClasses(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(userId: string, dto: CreateSubjectDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    return this.prisma.subject.create({
      data: {
        schoolId,
        name,
        code: dto.code?.trim() || undefined,
      },
    });
  }

  async listSubjects(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  async createStudent(userId: string, dto: CreateStudentDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();

    if (!firstName || !lastName) throw new BadRequestException('firstName and lastName are required');

    return this.prisma.student.create({
      data: {
        schoolId,
        firstName,
        lastName,
        studentNo: dto.studentNo?.trim() || undefined,
      },
    });
  }

  async listStudents(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.student.findMany({
      where: { schoolId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        parents: { include: { parent: true } },
        enrollments: { include: { class: true, session: true, term: true } },
      },
    });
  }

  async createParent(userId: string, dto: CreateParentDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const fullName = dto.fullName?.trim();
    if (!fullName) throw new BadRequestException('fullName is required');

    return this.prisma.parent.create({
      data: {
        schoolId,
        fullName,
        phone: dto.phone?.trim() || undefined,
        email: dto.email?.trim().toLowerCase() || undefined,
      },
    });
  }

  async listParents(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.parent.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: { students: { include: { student: true } } },
    });
  }

  async linkParentToStudent(userId: string, parentId: string, dto: LinkParentStudentDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const parent = await this.prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('parent not found');
    if (parent.schoolId !== schoolId) throw new ForbiddenException();

    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('student not found');
    if (student.schoolId !== schoolId) throw new ForbiddenException();

    return this.prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId, studentId: dto.studentId } },
      create: {
        parentId,
        studentId: dto.studentId,
        relationship: dto.relationship?.trim() || undefined,
      },
      update: {
        relationship: dto.relationship?.trim() || undefined,
      },
    });
  }

  async enrollStudent(userId: string, dto: CreateEnrollmentDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('student not found');
    if (student.schoolId !== schoolId) throw new ForbiddenException();

    const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('class not found');
    if (cls.schoolId !== schoolId) throw new ForbiddenException();

    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('school not found');

    const effectiveSessionId = dto.sessionId || school.activeSessionId;
    const effectiveTermId = dto.termId || school.activeTermId;

    if (!effectiveSessionId) {
      throw new BadRequestException('sessionId is required (or set an active session)');
    }

    const session = await this.prisma.academicSession.findUnique({ where: { id: effectiveSessionId } });
    if (!session) throw new NotFoundException('session not found');
    if (session.schoolId !== schoolId) throw new ForbiddenException();

    if (effectiveTermId) {
      const term = await this.prisma.term.findUnique({ where: { id: effectiveTermId } });
      if (!term) throw new NotFoundException('term not found');
      if (term.sessionId !== session.id) throw new BadRequestException('term does not belong to session');
    }

    return this.prisma.enrollment.create({
      data: {
        studentId: dto.studentId,
        classId: dto.classId,
        sessionId: effectiveSessionId,
        termId: effectiveTermId || undefined,
      },
      include: { student: true, class: true, session: true, term: true },
    });
  }

  async listEnrollments(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.enrollment.findMany({
      where: {
        student: { schoolId },
      },
      orderBy: { createdAt: 'desc' },
      include: { student: true, class: true, session: true, term: true },
    });
  }
}
