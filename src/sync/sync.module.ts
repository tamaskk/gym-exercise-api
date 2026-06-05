import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { ExercisesModule } from '../exercises/exercises.module';
import { MetadataModule } from '../metadata/metadata.module';
import { ExerciseDbClient } from './exercisedb.client';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    // Configure axios defaults from the typed config.
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        timeout: config.get('source.timeoutMs', { infer: true }),
        headers: { Accept: 'application/json' },
      }),
    }),
    ExercisesModule,
    MetadataModule,
  ],
  controllers: [SyncController],
  providers: [ExerciseDbClient, SyncService],
  exports: [ExerciseDbClient, SyncService],
})
export class SyncModule {}
