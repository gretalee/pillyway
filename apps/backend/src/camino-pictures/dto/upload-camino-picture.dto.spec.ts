import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { UploadCaminoPictureDto } from './upload-camino-picture.dto';

// ─── Helper ──────────────────────────────────────────────────────────────────

async function validatePlain(plain: Record<string, unknown>) {
  const instance = plainToInstance(UploadCaminoPictureDto, plain);
  const errors = await validate(instance);
  return { instance, errors };
}

// ─── UploadCaminoPictureDto ───────────────────────────────────────────────────

describe('UploadCaminoPictureDto', () => {
  it('transforms "true" string to boolean true and passes validation', async () => {
    const { instance, errors } = await validatePlain({ isPrimary: 'true' });

    expect(instance.isPrimary).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('transforms "false" string to boolean false and passes validation', async () => {
    const { instance, errors } = await validatePlain({ isPrimary: 'false' });

    expect(instance.isPrimary).toBe(false);
    expect(errors).toHaveLength(0);
  });

  it('fails validation with @IsDefined error when isPrimary is missing', async () => {
    const { errors } = await validatePlain({});

    expect(errors.length).toBeGreaterThan(0);
    const isPrimaryError = errors.find((e) => e.property === 'isPrimary');
    expect(isPrimaryError, 'expected a validation error on property isPrimary').toBeDefined();
  });

  it('fails validation with @IsBoolean error when isPrimary is an unrecognised string', async () => {
    const { errors } = await validatePlain({ isPrimary: 'yes' });

    expect(errors.length).toBeGreaterThan(0);
    const isPrimaryError = errors.find((e) => e.property === 'isPrimary');
    expect(isPrimaryError, 'expected a validation error on property isPrimary').toBeDefined();
  });
});
