import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExercisesModule } from '../exercises/exercises.module';
import {
  WorkoutTask,
  WorkoutTaskSchema,
} from './schemas/workout-task.schema';
import { WorkoutTasksController } from './workout-tasks.controller';
import { WorkoutTasksService } from './workout-tasks.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkoutTask.name, schema: WorkoutTaskSchema },
    ]),
    // Needed to validate/resolve referenced exercises when building items.
    ExercisesModule,
  ],
  controllers: [WorkoutTasksController],
  providers: [WorkoutTasksService],
})
export class WorkoutTasksModule {}
