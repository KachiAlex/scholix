import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResultsService } from './results.service';
import { CreateResultTemplateDto, UpdateResultTemplateDto } from './dto/result-template.dto';
import { CreateResultDraftDto, UpdateResultDraftDto } from './dto/result-draft.dto';

@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  private assertCanManageResults(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('SUPERADMIN') && !roles.includes('ADMIN')) {
      throw new ForbiddenException('insufficient permissions');
    }
  }

  @Get('results/templates')
  listTemplates(@Request() req: any) {
    this.assertCanManageResults(req);
    return this.results.listTemplates(req.user.userId);
  }

  @Post('results/templates')
  createTemplate(@Request() req: any, @Body() dto: CreateResultTemplateDto) {
    this.assertCanManageResults(req);
    return this.results.createTemplate(req.user.userId, dto);
  }

  @Patch('results/templates/:templateId')
  updateTemplate(@Request() req: any, @Param('templateId') templateId: string, @Body() dto: UpdateResultTemplateDto) {
    this.assertCanManageResults(req);
    return this.results.updateTemplate(req.user.userId, templateId, dto);
  }

  @Get('results/drafts')
  listDrafts(@Request() req: any, @Query('templateId') templateId?: string, @Query('status') status?: string) {
    this.assertCanManageResults(req);
    return this.results.listDrafts(req.user.userId, { templateId, status });
  }

  @Post('results/drafts')
  createDraft(@Request() req: any, @Body() dto: CreateResultDraftDto) {
    this.assertCanManageResults(req);
    return this.results.createDraft(req.user.userId, dto);
  }

  @Patch('results/drafts/:draftId')
  updateDraft(@Request() req: any, @Param('draftId') draftId: string, @Body() dto: UpdateResultDraftDto) {
    this.assertCanManageResults(req);
    return this.results.updateDraft(req.user.userId, draftId, dto);
  }
}
