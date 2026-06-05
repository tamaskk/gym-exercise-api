import { plainToInstance, Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * Schema used by `@nestjs/config` to validate the process environment at boot.
 * A misconfigured environment fails fast with a descriptive error instead of
 * surfacing as a confusing runtime fault later.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(65535)
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : value))
  PORT?: number;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  MONGODB_URI?: string;

  @IsOptional()
  @IsString()
  SOURCE_API_BASE_URL?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : value))
  SOURCE_API_TIMEOUT_MS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : value))
  SYNC_PAGE_SIZE?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : value))
  SYNC_REQUEST_DELAY_MS?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : value))
  SYNC_MAX_RETRIES?: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: true });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    );
  }
  return config;
}
