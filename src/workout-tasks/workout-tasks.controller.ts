import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiStandardErrors } from '../common/decorators/api-standard-errors.decorator';
import { CreateWorkoutTaskDto } from './dto/create-workout-task.dto';
import { UpdateWorkoutTaskDto } from './dto/update-workout-task.dto';
import { QueryWorkoutTasksDto } from './dto/query-workout-tasks.dto';
import {
  WorkoutTaskDto,
  WorkoutTaskItemResponse,
  WorkoutTaskListResponse,
} from './dto/workout-task-response.dto';
import { WorkoutTasksService } from './workout-tasks.service';

@ApiTags('workout-tasks')
@ApiStandardErrors()
@Controller('workout-tasks')
export class WorkoutTasksController {
  constructor(private readonly service: WorkoutTasksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a workout task',
    description:
      'Creates a draft task. Optionally seed it with `items` and/or ' +
      '`seedExerciseIds` (e.g. ids returned from a search/filter).',
  })
  @ApiCreatedResponse({ type: WorkoutTaskItemResponse })
  async create(@Body() dto: CreateWorkoutTaskDto) {
    const task = await this.service.create(dto);
    return { success: true, data: WorkoutTaskDto.fromEntity(task) };
  }

  @Get()
  @ApiOperation({ summary: 'List workout tasks (filter by status)' })
  @ApiOkResponse({ type: WorkoutTaskListResponse })
  async findMany(@Query() query: QueryWorkoutTasksDto) {
    const page = await this.service.findMany(query);
    return {
      success: true,
      meta: page.meta,
      data: page.data.map(WorkoutTaskDto.fromEntity),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workout task by id' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: WorkoutTaskItemResponse })
  async findOne(@Param('id') id: string) {
    const task = await this.service.findOne(id);
    return { success: true, data: WorkoutTaskDto.fromEntity(task) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (rename / replace & reorder items)' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: WorkoutTaskItemResponse })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkoutTaskDto) {
    const task = await this.service.update(id, dto);
    return { success: true, data: WorkoutTaskDto.fromEntity(task) };
  }

  @Patch(':id/items/:itemId/complete')
  @ApiOperation({ summary: 'Mark a single item as done' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'itemId' })
  @ApiOkResponse({ type: WorkoutTaskItemResponse })
  async completeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const task = await this.service.completeItem(id, itemId);
    return { success: true, data: WorkoutTaskDto.fromEntity(task) };
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start a workout task (draft → in_progress)' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: WorkoutTaskItemResponse })
  async start(@Param('id') id: string) {
    const task = await this.service.start(id);
    return { success: true, data: WorkoutTaskDto.fromEntity(task) };
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete a workout task (in_progress → completed)' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: WorkoutTaskItemResponse })
  async complete(@Param('id') id: string) {
    const task = await this.service.complete(id);
    return { success: true, data: WorkoutTaskDto.fromEntity(task) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workout task' })
  @ApiParam({ name: 'id' })
  @ApiNoContentResponse({ description: 'Workout task deleted.' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
