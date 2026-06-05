import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../common/decorators/api-standard-errors.decorator';
import { SyncService } from './sync.service';
import { SyncResultDto } from './dto/sync-result.dto';

@ApiTags('sync')
@ApiStandardErrors()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger a full data sync from the ExerciseDB source',
    description:
      'Walks the upstream cursor pagination to completion and upserts all ' +
      'exercises and metadata locally. Idempotent. Data © AscendAPI.',
  })
  @ApiOkResponse({ type: SyncResultDto })
  runSync(): Promise<SyncResultDto> {
    return this.sync.runFullSync();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current/last sync progress' })
  status() {
    return { success: true, data: this.sync.getProgress() };
  }
}
