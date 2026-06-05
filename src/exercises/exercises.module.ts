import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exercise.name, schema: ExerciseSchema },
    ]),
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  // Exported so the sync module can upsert and the workout-tasks module can
  // resolve exercise snapshots.
  exports: [ExercisesService],
})
export class ExercisesModule {}
