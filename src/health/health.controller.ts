import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ATTRIBUTION } from '../sync/sync.service';

class LivenessResponse {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: { database: 'up' } })
  services!: Record<string, string>;

  @ApiProperty({
    example: 'Exercise data © AscendAPI (ExerciseDB). https://ascendapi.com',
  })
  attribution!: string;
}

/**
 * Health endpoint mirroring the source `/liveness`. Reports the status of the
 * MongoDB connection and surfaces the required AscendAPI attribution.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness / health check' })
  @ApiOkResponse({ type: LivenessResponse })
  async liveness(): Promise<LivenessResponse> {
    // Mongoose readyState: 1 = connected. Confirm with a lightweight ping.
    let database = 'down';
    try {
      if (this.connection.readyState === 1) {
        await this.connection.db?.admin().ping();
        database = 'up';
      }
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      services: { database },
      attribution: ATTRIBUTION,
    };
  }
}
