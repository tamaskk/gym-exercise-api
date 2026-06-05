import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { ATTRIBUTION } from './sync/sync.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<AppConfig, true>);

  // All routes are served under /api/v1 to mirror the source API surface.
  app.setGlobalPrefix('api/v1');
  app.enableCors();

  // Swagger / OpenAPI docs at /docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gym Exercise & Workout-Task API')
    .setDescription(
      'A NestJS API that mirrors and extends the ExerciseDB v1 dataset, with ' +
        'local persistence, sync, fuzzy search, and a workout-task domain.\n\n' +
        `**Attribution:** ${ATTRIBUTION}`,
    )
    .setVersion('1.0.0')
    .addTag('exercises')
    .addTag('workout-tasks')
    .addTag('bodyparts')
    .addTag('muscles')
    .addTag('equipments')
    .addTag('sync')
    .addTag('health')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get('port', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 API listening on http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
