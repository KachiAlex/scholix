import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsPositive, IsString, ValidateIf } from 'class-validator';

type NullableString = string | null | undefined;

const shouldValidateNullableField = (_obj: UpdateTenantDto, value: NullableString) =>
  value !== null && value !== undefined;

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  licenseSeats?: number;

  @ValidateIf(shouldValidateNullableField)
  @IsISO8601()
  licenseExpiresAt?: string | null;

  @ValidateIf(shouldValidateNullableField)
  @IsString()
  licenseNotes?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isSuspended?: boolean;
}
