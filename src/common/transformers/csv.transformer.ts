import { Transform } from 'class-transformer';

/**
 * class-transformer decorator that normalises a comma-separated query string
 * (e.g. `?bodyParts=Chest,Shoulders`) into a trimmed, lower-cased,
 * de-duplicated `string[]`. Empty input becomes `undefined` so it is treated
 * as "no filter". Lower-casing keeps filtering case-insensitive against the
 * normalised values we store.
 */
export const CsvToLowerArray = () =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const list = Array.isArray(value) ? value : String(value).split(',');
    const cleaned = list
      .map((v) => String(v).trim().toLowerCase())
      .filter((v) => v.length > 0);
    return cleaned.length ? Array.from(new Set(cleaned)) : undefined;
  });
