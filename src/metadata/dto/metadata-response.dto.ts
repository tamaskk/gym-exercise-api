import { ApiProperty } from '@nestjs/swagger';

/** A single metadata entry — `{ name }`. Matches the source dataset shape. */
export class NamedItemDto {
  @ApiProperty({ example: 'chest' })
  name!: string;
}

/** `{ success, data: NamedItemDto[] }`. */
export class NamedListResponse {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: [NamedItemDto] })
  data!: NamedItemDto[];
}
