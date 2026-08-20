import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateAccommodationDto } from './create-accommodation.dto';

function build(website: string): CreateAccommodationDto {
  return plainToInstance(CreateAccommodationDto, {
    name: 'Test Hostel',
    type: 'hostel',
    website,
  });
}

describe('CreateAccommodationDto — website normalization', () => {
  it('prepends https:// to a protocol-less website before validation', async () => {
    const dto = build('www.dieUnterkunft.de');

    expect(dto.website).toBe('https://www.dieUnterkunft.de');
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('leaves an already-absolute https:// website unchanged', async () => {
    const dto = build('https://dieUnterkunft.de');

    expect(dto.website).toBe('https://dieUnterkunft.de');
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
