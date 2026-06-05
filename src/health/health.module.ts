import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Health module. Depends on the `sync` module only for the shared ATTRIBUTION
 * constant (imported directly, not via DI), and on the global TypeORM
 * DataSource which is available app-wide.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
