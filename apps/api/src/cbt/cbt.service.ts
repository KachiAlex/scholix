import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { AddQuestionsToExamDto } from './dto/add-questions-to-exam.dto';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { AutosaveAnswerDto } from './dto/autosave-answer.dto';

@Injectable()
export class CbtService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSchoolIdForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');
    if (!user.schoolId) throw new BadRequestException('user has no schoolId; register with schoolName');
    return user.schoolId;
  }

  async createQuestion(userId: string, dto: CreateQuestionDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const text = dto.text?.trim();
    if (!text) throw new BadRequestException('text is required');

    if (!dto.options || dto.options.length < 2) {
      throw new BadRequestException('options must have at least 2 items');
    }

    const options = dto.options.map((o) => ({
      text: o.text?.trim(),
      isCorrect: o.isCorrect ?? false,
    }));

    if (options.some((o) => !o.text)) {
      throw new BadRequestException('option text is required');
    }

    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException('exactly 1 option must be marked correct');
    }

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
      if (!subject) throw new NotFoundException('subject not found');
      if (subject.schoolId !== schoolId) throw new ForbiddenException();
    }

    return this.prisma.cbtQuestion.create({
      data: {
        schoolId,
        subjectId: dto.subjectId || undefined,
        text,
        options: {
          create: options,
        },
      },
      include: { options: true, subject: true },
    });
  }

  async listQuestions(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.cbtQuestion.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: { options: true, subject: true },
    });
  }

  async createExam(userId: string, dto: CreateExamDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    if (!dto.classId) throw new BadRequestException('classId is required');

    const durationMinutes = Number(dto.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be a positive number');
    }

    const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('class not found');
    if (cls.schoolId !== schoolId) throw new ForbiddenException();

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
      if (!subject) throw new NotFoundException('subject not found');
      if (subject.schoolId !== schoolId) throw new ForbiddenException();
    }

    if (dto.sessionId) {
      const session = await this.prisma.academicSession.findUnique({ where: { id: dto.sessionId } });
      if (!session) throw new NotFoundException('session not found');
      if (session.schoolId !== schoolId) throw new ForbiddenException();
    }

    if (dto.termId) {
      const term = await this.prisma.term.findUnique({ where: { id: dto.termId } });
      if (!term) throw new NotFoundException('term not found');

      const termSession = await this.prisma.academicSession.findUnique({ where: { id: term.sessionId } });
      if (!termSession) throw new NotFoundException('session not found');
      if (termSession.schoolId !== schoolId) throw new ForbiddenException();

      if (dto.sessionId && term.sessionId !== dto.sessionId) {
        throw new BadRequestException('term does not belong to session');
      }
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (startsAt && isNaN(startsAt.getTime())) throw new BadRequestException('startsAt is invalid');
    if (endsAt && isNaN(endsAt.getTime())) throw new BadRequestException('endsAt is invalid');

    const questionIds = dto.questionIds || [];
    if (questionIds.length > 0) {
      const count = await this.prisma.cbtQuestion.count({ where: { id: { in: questionIds }, schoolId } });
      if (count !== questionIds.length) throw new BadRequestException('one or more questionIds are invalid');
    }

    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.cbtExam.create({
        data: {
          schoolId,
          name,
          classId: dto.classId,
          subjectId: dto.subjectId || undefined,
          sessionId: dto.sessionId || undefined,
          termId: dto.termId || undefined,
          durationMinutes,
          startsAt,
          endsAt,
        },
      });

      if (questionIds.length > 0) {
        await tx.cbtExamQuestion.createMany({
          data: questionIds.map((qid, idx) => ({
            examId: exam.id,
            questionId: qid,
            order: idx + 1,
          })),
          skipDuplicates: true,
        });
      }

      return tx.cbtExam.findUnique({
        where: { id: exam.id },
        include: {
          class: true,
          subject: true,
          session: true,
          term: true,
          questions: { include: { question: { include: { options: true } } }, orderBy: { order: 'asc' } },
        },
      });
    });
  }

  async listExams(userId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);
    return this.prisma.cbtExam.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        class: true,
        subject: true,
        session: true,
        term: true,
        questions: { include: { question: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async addQuestionsToExam(userId: string, examId: string, dto: AddQuestionsToExamDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const exam = await this.prisma.cbtExam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.schoolId !== schoolId) throw new ForbiddenException();

    const questionIds = dto.questionIds || [];
    if (questionIds.length === 0) throw new BadRequestException('questionIds is required');

    const count = await this.prisma.cbtQuestion.count({ where: { id: { in: questionIds }, schoolId } });
    if (count !== questionIds.length) throw new BadRequestException('one or more questionIds are invalid');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cbtExamQuestion.findMany({
        where: { examId },
        select: { order: true },
        orderBy: { order: 'desc' },
        take: 1,
      });
      const baseOrder = existing[0]?.order ?? 0;

      await tx.cbtExamQuestion.createMany({
        data: questionIds.map((qid, idx) => ({
          examId,
          questionId: qid,
          order: baseOrder + idx + 1,
        })),
        skipDuplicates: true,
      });

      return tx.cbtExam.findUnique({
        where: { id: examId },
        include: {
          class: true,
          subject: true,
          session: true,
          term: true,
          questions: { include: { question: { include: { options: true } } }, orderBy: { order: 'asc' } },
        },
      });
    });
  }

  async startAttempt(userId: string, examId: string, dto: StartAttemptDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const exam = await this.prisma.cbtExam.findUnique({
      where: { id: examId },
      include: {
        questions: { include: { question: { include: { options: true } } }, orderBy: { order: 'asc' } },
      },
    });
    if (!exam) throw new NotFoundException('exam not found');
    if (exam.schoolId !== schoolId) throw new ForbiddenException();

    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException('student not found');
    if (student.schoolId !== schoolId) throw new ForbiddenException();

    const attempt = await this.prisma.cbtAttempt.upsert({
      where: { examId_studentId: { examId, studentId: dto.studentId } },
      create: { examId, studentId: dto.studentId },
      update: {},
      include: { answers: true },
    });

    return {
      attempt,
      exam,
    };
  }

  async autosaveAnswer(userId: string, attemptId: string, dto: AutosaveAnswerDto) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const attempt = await this.prisma.cbtAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });
    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.exam.schoolId !== schoolId) throw new ForbiddenException();
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('attempt is not in progress');

    const examQuestion = await this.prisma.cbtExamQuestion.findFirst({
      where: { examId: attempt.examId, questionId: dto.questionId },
    });
    if (!examQuestion) throw new BadRequestException('question is not part of exam');

    const selectedOptionId = dto.selectedOptionId === null ? null : dto.selectedOptionId;

    if (selectedOptionId) {
      const option = await this.prisma.cbtQuestionOption.findUnique({ where: { id: selectedOptionId } });
      if (!option) throw new NotFoundException('option not found');
      if (option.questionId !== dto.questionId) throw new BadRequestException('option does not belong to question');
    }

    return this.prisma.cbtAttemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      create: {
        attemptId,
        questionId: dto.questionId,
        selectedOptionId: selectedOptionId || undefined,
      },
      update: {
        selectedOptionId: selectedOptionId === undefined ? undefined : selectedOptionId,
      },
      include: { question: true, selectedOption: true },
    });
  }

  async submitAttempt(userId: string, attemptId: string) {
    const schoolId = await this.getSchoolIdForUser(userId);

    const attempt = await this.prisma.cbtAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });
    if (!attempt) throw new NotFoundException('attempt not found');
    if (attempt.exam.schoolId !== schoolId) throw new ForbiddenException();
    if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('attempt is not in progress');

    return this.prisma.cbtAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        answers: { include: { question: true, selectedOption: true } },
        exam: true,
        student: true,
      },
    });
  }
}
