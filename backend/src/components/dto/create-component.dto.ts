import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateComponentDto {
  @Type(() => Number)
  @IsInt()
  environmentId: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsIn(['critical', 'degraded'])
  criticality: 'critical' | 'degraded';

  @IsString()
  @IsNotEmpty()
  probeType: string;

  @IsObject()
  probeConfig: Record<string, unknown>;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(86400)
  intervalSeconds: number;

  @Type(() => Boolean)
  @IsBoolean()
  enabled: boolean;
}
