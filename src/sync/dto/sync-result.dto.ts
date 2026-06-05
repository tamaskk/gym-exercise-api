import { ApiProperty } from '@nestjs/swagger';

/** Per-resource sync counters. */
export class SyncResourceResult {
  @ApiProperty({ example: 1500 })
  fetched!: number;

  @ApiProperty({ example: 1200 })
  inserted!: number;

  @ApiProperty({ example: 300 })
  updated!: number;
}

export class MetadataSyncResult {
  @ApiProperty({ example: 10 })
  bodyParts!: number;

  @ApiProperty({ example: 23 })
  muscles!: number;

  @ApiProperty({ example: 28 })
  equipments!: number;
}

/** Full result of a `POST /sync` run. */
export class SyncResultDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'completed', enum: ['completed', 'already_running'] })
  status!: 'completed' | 'already_running';

  @ApiProperty({ type: SyncResourceResult })
  exercises!: SyncResourceResult;

  @ApiProperty({ type: MetadataSyncResult })
  metadata!: MetadataSyncResult;

  @ApiProperty({ example: 14, description: 'Number of source pages walked.' })
  pages!: number;

  @ApiProperty({ example: 8123, description: 'Total duration (ms).' })
  durationMs!: number;

  @ApiProperty({ example: '2026-06-05T10:00:00.000Z' })
  startedAt!: string;

  @ApiProperty({ example: '2026-06-05T10:00:08.123Z' })
  finishedAt!: string;

  @ApiProperty({
    example: 'Exercise data © AscendAPI (ExerciseDB). https://ascendapi.com',
  })
  attribution!: string;
}
