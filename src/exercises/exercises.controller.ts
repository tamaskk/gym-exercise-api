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
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import {
  FilterByBodyPartsDto,
  FilterByEquipmentsDto,
  FilterByMusclesDto,
  FilterExercisesDto,
} from './dto/filter-exercises.dto';
import { SearchExercisesDto } from './dto/search-exercises.dto';
import {
  ExerciseDto,
  ExerciseItemResponse,
  ExerciseListResponse,
  ExerciseSearchResponse,
} from './dto/exercise-response.dto';
import { ExercisesService } from './exercises.service';
import { Exercise } from './schemas/exercise.schema';
import { PageMeta } from '../common/dto/response-envelope.dto';

/** Wraps a paginated result into the `{ success, meta, data }` envelope. */
function listEnvelope(page: { data: Exercise[]; meta: PageMeta }) {
  return {
    success: true,
    meta: page.meta,
    data: page.data.map(ExerciseDto.fromEntity),
  };
}

@ApiTags('exercises')
@ApiStandardErrors()
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  @ApiOperation({
    summary: 'Advanced exercise filtering',
    description:
      'Filter exercises by name, target/secondary muscles, body parts and equipment with cursor-based pagination.',
  })
  @ApiOkResponse({ type: ExerciseListResponse })
  async findMany(@Query() query: FilterExercisesDto) {
    return listEnvelope(await this.exercises.findMany(query));
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search exercises with fuzzy matching',
    description:
      'Fuzzy search over exercise names using Fuse.js. `threshold`: 0 = exact, 1 = very loose.',
  })
  @ApiOkResponse({ type: ExerciseSearchResponse })
  async search(@Query() query: SearchExercisesDto) {
    return { success: true, data: await this.exercises.search(query) };
  }

  @Get('bodyparts')
  @ApiOperation({ summary: 'Get exercises by body parts' })
  @ApiOkResponse({ type: ExerciseListResponse })
  async byBodyParts(@Query() query: FilterByBodyPartsDto) {
    return listEnvelope(await this.exercises.findByBodyParts(query));
  }

  @Get('muscles')
  @ApiOperation({ summary: 'Get exercises by target / secondary muscles' })
  @ApiOkResponse({ type: ExerciseListResponse })
  async byMuscles(@Query() query: FilterByMusclesDto) {
    return listEnvelope(await this.exercises.findByMuscles(query));
  }

  @Get('equipments')
  @ApiOperation({ summary: 'Get exercises by equipment' })
  @ApiOkResponse({ type: ExerciseListResponse })
  async byEquipments(@Query() query: FilterByEquipmentsDto) {
    return listEnvelope(await this.exercises.findByEquipments(query));
  }

  @Get(':exerciseId')
  @ApiOperation({ summary: 'Get a single exercise by id' })
  @ApiParam({ name: 'exerciseId', example: 'EIeI8Vf' })
  @ApiOkResponse({ type: ExerciseItemResponse })
  async findOne(@Param('exerciseId') exerciseId: string) {
    const exercise = await this.exercises.findOne(exerciseId);
    return { success: true, data: ExerciseDto.fromEntity(exercise) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom exercise' })
  @ApiCreatedResponse({ type: ExerciseItemResponse })
  async create(@Body() dto: CreateExerciseDto) {
    const exercise = await this.exercises.create(dto);
    return { success: true, data: ExerciseDto.fromEntity(exercise) };
  }

  @Patch(':exerciseId')
  @ApiOperation({ summary: 'Update an exercise' })
  @ApiParam({ name: 'exerciseId', example: 'custom-incline-pushup' })
  @ApiOkResponse({ type: ExerciseItemResponse })
  async update(
    @Param('exerciseId') exerciseId: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    const exercise = await this.exercises.update(exerciseId, dto);
    return { success: true, data: ExerciseDto.fromEntity(exercise) };
  }

  @Delete(':exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exercise' })
  @ApiParam({ name: 'exerciseId', example: 'custom-incline-pushup' })
  @ApiNoContentResponse({ description: 'Exercise deleted.' })
  async remove(@Param('exerciseId') exerciseId: string) {
    await this.exercises.remove(exerciseId);
  }
}
