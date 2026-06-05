import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { WorkoutTaskStatus } from '../schemas/workout-task.schema';

/** Query params for `GET /workout-tasks` — filter by status, paginated. */
export class QueryWorkoutTasksDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WorkoutTaskStatus })
  @IsOptional()
  @IsEnum(WorkoutTaskStatus)
  status?: WorkoutTaskStatus;
}
