import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ResultDraftStatus } from '@prisma/client';

export class CreateResultDraftDto {
  @IsString()
  templateId!: string;

  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  termId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value === null || typeof value === 'number')
  @IsNumber()
  totalScore?: number | null;

  @IsOptional()
  data?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateResultDraftDto {
  @IsOptional()
  @IsEnum(ResultDraftStatus)
  status?: ResultDraftStatus;

  @IsOptional()
  @ValidateIf((_, value) => value === null || typeof value === 'number')
  @IsNumber()
  totalScore?: number | null;

  @IsOptional()
  data?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  publishedAt?: string | null;
}
