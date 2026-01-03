import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SisService } from './sis.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { LinkParentStudentDto } from './dto/link-parent-student.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { SetActiveContextDto } from './dto/set-active-context.dto';

@UseGuards(JwtAuthGuard)
@Controller('sis')
export class SisController {
  constructor(private readonly sis: SisService) {}

  @Get('active')
  getActiveContext(@Request() req: any) {
    return this.sis.getActiveContext(req.user.userId);
  }

  @Put('active')
  setActiveContext(@Request() req: any, @Body() dto: SetActiveContextDto) {
    return this.sis.setActiveContext(req.user.userId, dto);
  }

  @Post('sessions')
  createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
    return this.sis.createSession(req.user.userId, dto);
  }

  @Get('sessions')
  listSessions(@Request() req: any) {
    return this.sis.listSessions(req.user.userId);
  }

  @Post('sessions/:sessionId/terms')
  createTerm(@Request() req: any, @Param('sessionId') sessionId: string, @Body() dto: CreateTermDto) {
    return this.sis.createTerm(req.user.userId, sessionId, dto);
  }

  @Get('sessions/:sessionId/terms')
  listTerms(@Request() req: any, @Param('sessionId') sessionId: string) {
    return this.sis.listTerms(req.user.userId, sessionId);
  }

  @Post('classes')
  createClass(@Request() req: any, @Body() dto: CreateClassDto) {
    return this.sis.createClass(req.user.userId, dto);
  }

  @Get('classes')
  listClasses(@Request() req: any) {
    return this.sis.listClasses(req.user.userId);
  }

  @Post('subjects')
  createSubject(@Request() req: any, @Body() dto: CreateSubjectDto) {
    return this.sis.createSubject(req.user.userId, dto);
  }

  @Get('subjects')
  listSubjects(@Request() req: any) {
    return this.sis.listSubjects(req.user.userId);
  }

  @Post('students')
  createStudent(@Request() req: any, @Body() dto: CreateStudentDto) {
    return this.sis.createStudent(req.user.userId, dto);
  }

  @Get('students')
  listStudents(@Request() req: any) {
    return this.sis.listStudents(req.user.userId);
  }

  @Post('parents')
  createParent(@Request() req: any, @Body() dto: CreateParentDto) {
    return this.sis.createParent(req.user.userId, dto);
  }

  @Get('parents')
  listParents(@Request() req: any) {
    return this.sis.listParents(req.user.userId);
  }

  @Post('parents/:parentId/link-student')
  linkParentToStudent(
    @Request() req: any,
    @Param('parentId') parentId: string,
    @Body() dto: LinkParentStudentDto,
  ) {
    return this.sis.linkParentToStudent(req.user.userId, parentId, dto);
  }

  @Post('enrollments')
  enrollStudent(@Request() req: any, @Body() dto: CreateEnrollmentDto) {
    return this.sis.enrollStudent(req.user.userId, dto);
  }

  @Get('enrollments')
  listEnrollments(@Request() req: any) {
    return this.sis.listEnrollments(req.user.userId);
  }
}
