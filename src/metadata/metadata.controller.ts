import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../common/decorators/api-standard-errors.decorator';
import { MetadataService } from './metadata.service';
import { NamedListResponse } from './dto/metadata-response.dto';

/**
 * Top-level metadata endpoints: `GET /bodyparts`, `GET /muscles`,
 * `GET /equipments`. Each returns `{ success, data: [{ name }] }`.
 *
 * Registered at the application root (no shared prefix) because the three
 * resources live at distinct top-level paths in the source API.
 */
@ApiStandardErrors()
@Controller()
export class MetadataController {
  constructor(private readonly metadata: MetadataService) {}

  @Get('bodyparts')
  @ApiTags('bodyparts')
  @ApiOperation({ summary: 'List all body parts' })
  @ApiOkResponse({ type: NamedListResponse })
  async bodyParts() {
    const data = await this.metadata.findAllBodyParts();
    return { success: true, data: data.map((b) => ({ name: b.name })) };
  }

  @Get('muscles')
  @ApiTags('muscles')
  @ApiOperation({ summary: 'List all muscles' })
  @ApiOkResponse({ type: NamedListResponse })
  async muscles() {
    const data = await this.metadata.findAllMuscles();
    return { success: true, data: data.map((m) => ({ name: m.name })) };
  }

  @Get('equipments')
  @ApiTags('equipments')
  @ApiOperation({ summary: 'List all equipment' })
  @ApiOkResponse({ type: NamedListResponse })
  async equipments() {
    const data = await this.metadata.findAllEquipments();
    return { success: true, data: data.map((e) => ({ name: e.name })) };
  }
}
