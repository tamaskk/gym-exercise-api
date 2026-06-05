import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import configuration, { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ExercisesModule } from './exercises/exercises.module';
import { MetadataModule } from './metadata/metadata.module';
import { SyncModule } from './sync/sync.module';
import { WorkoutTasksModule } from './workout-tasks/workout-tasks.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Typed, validated configuration available everywhere.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // MongoDB via Mongoose. Connection string comes from MONGODB_URI.
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('db.uri', { infer: true }),
      }),
    }),
    ExercisesModule,
    MetadataModule,
    SyncModule,
    WorkoutTasksModule,
    HealthModule,
  ],
  providers: [
    // Global validation: transform payloads to DTO instances, strip unknown
    // properties, and coerce primitive types from query strings.
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: false },
        }),
    },
    // Global exception filter mapping everything to the documented error model.
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
