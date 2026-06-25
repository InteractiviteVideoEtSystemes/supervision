import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateComponentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  environmentId?: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @IsIn(['critical', 'degraded'])
  criticality?: 'critical' | 'degraded';

  @IsOptional()
  @IsString()
  probeType?: string;

  @IsOptional()
  @IsObject()
  probeConfig?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(86400)
  intervalSeconds?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;
}
