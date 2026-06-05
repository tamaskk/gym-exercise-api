import { ApiProperty } from '@nestjs/swagger';
import { PageMeta } from '../../common/dto/response-envelope.dto';
import {
  WorkoutTask,
  WorkoutTaskItem,
  WorkoutTaskStatus,
} from '../schemas/workout-task.schema';

export class WorkoutTaskItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'EIeI8Vf' }) exerciseId!: string;
  @ApiProperty({ required: false, nullable: true }) exerciseName!: string | null;
  @ApiProperty({ required: false, nullable: true }) gifUrl!: string | null;
  @ApiProperty({ example: 4 }) sets!: number;
  @ApiProperty({ example: 10 }) reps!: number;
  @ApiProperty({ example: 60 }) weight!: number;
  @ApiProperty({ example: 90 }) rest!: number;
  @ApiProperty({ example: 0 }) position!: number;
  @ApiProperty({ example: false }) done!: boolean;

  static fromEntity(i: WorkoutTaskItem): WorkoutTaskItemDto {
    return {
      id: String(i._id),
      exerciseId: i.exerciseId,
      exerciseName: i.exerciseName,
      gifUrl: i.gifUrl,
      sets: i.sets,
      reps: i.reps,
      weight: i.weight,
      rest: i.rest,
      position: i.position,
      done: i.done,
    };
  }
}

export class WorkoutTaskDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Push day — chest & triceps' }) title!: string;
  @ApiProperty({ enum: WorkoutTaskStatus }) status!: WorkoutTaskStatus;
  @ApiProperty({ type: [WorkoutTaskItemDto] }) items!: WorkoutTaskItemDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ required: false, nullable: true }) startedAt!: Date | null;
  @ApiProperty({ required: false, nullable: true }) completedAt!: Date | null;

  static fromEntity(t: WorkoutTask): WorkoutTaskDto {
    return {
      id: String(t._id),
      title: t.title,
      status: t.status,
      items: (t.items ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(WorkoutTaskItemDto.fromEntity),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    };
  }
}

export class WorkoutTaskItemResponse {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty({ type: WorkoutTaskDto }) data!: WorkoutTaskDto;
}

export class WorkoutTaskListResponse {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty({ type: PageMeta }) meta!: PageMeta;
  @ApiProperty({ type: [WorkoutTaskDto] }) data!: WorkoutTaskDto[];
}
