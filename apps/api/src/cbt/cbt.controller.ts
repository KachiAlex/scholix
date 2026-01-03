import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CbtService } from './cbt.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { AddQuestionsToExamDto } from './dto/add-questions-to-exam.dto';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { AutosaveAnswerDto } from './dto/autosave-answer.dto';

@UseGuards(JwtAuthGuard)
@Controller('cbt')
export class CbtController {
  constructor(private readonly cbt: CbtService) {}

  @Post('questions')
  createQuestion(@Request() req: any, @Body() dto: CreateQuestionDto) {
    return this.cbt.createQuestion(req.user.userId, dto);
  }

  @Get('questions')
  listQuestions(@Request() req: any) {
    return this.cbt.listQuestions(req.user.userId);
  }

  @Post('exams')
  createExam(@Request() req: any, @Body() dto: CreateExamDto) {
    return this.cbt.createExam(req.user.userId, dto);
  }

  @Get('exams')
  listExams(@Request() req: any) {
    return this.cbt.listExams(req.user.userId);
  }

  @Post('exams/:examId/questions')
  addQuestionsToExam(@Request() req: any, @Param('examId') examId: string, @Body() dto: AddQuestionsToExamDto) {
    return this.cbt.addQuestionsToExam(req.user.userId, examId, dto);
  }

  @Post('exams/:examId/start')
  startAttempt(@Request() req: any, @Param('examId') examId: string, @Body() dto: StartAttemptDto) {
    return this.cbt.startAttempt(req.user.userId, examId, dto);
  }

  @Put('attempts/:attemptId/answers')
  autosaveAnswer(
    @Request() req: any,
    @Param('attemptId') attemptId: string,
    @Body() dto: AutosaveAnswerDto,
  ) {
    return this.cbt.autosaveAnswer(req.user.userId, attemptId, dto);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(@Request() req: any, @Param('attemptId') attemptId: string) {
    return this.cbt.submitAttempt(req.user.userId, attemptId);
  }
}
