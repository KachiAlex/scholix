import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResultTemplateDto, UpdateResultTemplateDto } from './dto/result-template.dto';
import { CreateResultDraftDto, UpdateResultDraftDto } from './dto/result-draft.dto';

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSchoolIdForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeSchoolId: true, primarySchoolId: true },
    });
    if (!user) throw new NotFoundException('user not found');
    const schoolId = user.activeSchoolId ?? user.primarySchoolId;
    if (!schoolId) throw new BadRequestException('user has no school; set active school first');
    return schoolId;
  }

  private async ensureTemplateForSchool(schoolId: string, templateId: string) {
    const template = await this.prisma.resultTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('template not found');
    if (template.schoolId !== schoolId) throw new ForbiddenException();
    return template;
  }

  private async ensureStudentForSchool(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('student not found');
    if (student.schoolId !== schoolId) throw new ForbiddenException();
    return student;
  }

  private async ensureTermForSchool(schoolId: string, termId: string | null) {
    if (!termId) return null;
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException('term not found');
    const session = await this.prisma.academicSession.findUnique({ where: { id: term.sessionId } });
    if (!session || session.schoolId !== schoolId) throw new ForbiddenException();
    return term;
  }

  async createTemplate(userId: string, dto: CreateResultTemplateDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    return this.prisma.resultTemplate.create({
      data: {
        schoolId,
        name,
        description: dto.description?.trim() || null,
        gradingConfig: dto.gradingConfig ?? undefined,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async listTemplates(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.resultTemplate.findMany({
      where: { schoolId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTemplate(userId: string, templateId: string, dto: UpdateResultTemplateDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const template = await this.prisma.resultTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('template not found');
    if (template.schoolId !== schoolId) throw new ForbiddenException();

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      const trimmed = dto.name?.trim();
      if (!trimmed) throw new BadRequestException('name cannot be empty');
      data.name = trimmed;
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.gradingConfig !== undefined) {
      data.gradingConfig = dto.gradingConfig;
    }
    if (dto.isArchived !== undefined) {
      data.isArchived = dto.isArchived;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no updates provided');
    }

    return this.prisma.resultTemplate.update({
      where: { id: templateId },
      data: {
        ...data,
        updatedById: userId,
      },
    });
  }

  async listDrafts(userId: string, filter?: { templateId?: string; status?: string }) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const where: Record<string, unknown> = { schoolId };
    if (filter?.templateId) {
      await this.ensureTemplateForSchool(schoolId, filter.templateId);
      where.templateId = filter.templateId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.studentResultDraft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: true,
        template: true,
        term: true,
      },
    });
  }

  async createDraft(userId: string, dto: CreateResultDraftDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    if (!dto.templateId) throw new BadRequestException('templateId is required');
    if (!dto.studentId) throw new BadRequestException('studentId is required');

    await this.ensureTemplateForSchool(schoolId, dto.templateId);
    await this.ensureStudentForSchool(schoolId, dto.studentId);
    await this.ensureTermForSchool(schoolId, dto.termId ?? null);

    return this.prisma.studentResultDraft.create({
      data: {
        schoolId,
        templateId: dto.templateId,
        studentId: dto.studentId,
        termId: dto.termId || undefined,
        totalScore: dto.totalScore ?? null,
        data: dto.data ?? undefined,
        notes: dto.notes?.trim() || null,
      },
      include: { student: true, template: true, term: true },
    });
  }

  async updateDraft(userId: string, draftId: string, dto: UpdateResultDraftDto) {
    const schoolId = await this.getSchoolIdForUser(userId);
    const draft = await this.prisma.studentResultDraft.findUnique({ where: { id: draftId } });
    if (!draft) throw new NotFoundException('draft not found');
    if (draft.schoolId !== schoolId) throw new ForbiddenException();

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'PUBLISHED') {
        data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : new Date();
      }
    }
    if (dto.totalScore !== undefined) {
      if (dto.totalScore !== null && !Number.isFinite(dto.totalScore)) {
        throw new BadRequestException('totalScore must be numeric');
      }
      data.totalScore = dto.totalScore;
    }
    if (dto.data !== undefined) {
      data.data = dto.data;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }
    if (dto.publishedAt !== undefined && dto.status !== 'PUBLISHED') {
      data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('no updates provided');
    }

    return this.prisma.studentResultDraft.update({
      where: { id: draftId },
      data,
      include: { student: true, template: true, term: true },
    });
  }
}
