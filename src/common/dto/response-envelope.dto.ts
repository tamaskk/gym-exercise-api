import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata block returned with every list response. Identical to the
 * source API's `meta` object.
 */
export class PageMeta {
  @ApiProperty({ example: 1789, description: 'Total number of matching records.' })
  total!: number;

  @ApiProperty({ example: true, description: 'Whether a next page exists.' })
  hasNextPage!: boolean;

  @ApiProperty({ example: false, description: 'Whether a previous page exists.' })
  hasPreviousPage!: boolean;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'EIeI8Vf',
    description: 'Cursor to pass as `after` to fetch the next page.',
  })
  nextCursor!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'trmaT4d',
    description: 'Cursor to pass as `before` to fetch the previous page.',
  })
  previousCursor!: string | null;
}

/**
 * Generic single-item envelope: `{ success, data }`.
 * Used as a base; concrete controllers override `data`'s Swagger type.
 */
export class ItemEnvelope<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  data!: T;
}

/**
 * Generic list envelope: `{ success, meta, data }`.
 */
export class ListEnvelope<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: PageMeta })
  meta!: PageMeta;

  data!: T[];
}
