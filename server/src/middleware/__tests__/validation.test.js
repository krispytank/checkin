import { describe, it, expect } from 'vitest';
import { validateGeoLocation, hasRequiredLocationFields } from '../validation.js';

describe('validateGeoLocation', () => {
  it('accepts valid coordinates at the equator and zero accuracy', () => {
    const location = { latitude: 0, longitude: 0, accuracy: 0 };

    expect(validateGeoLocation(location)).toBe(true);
    expect(hasRequiredLocationFields(location)).toBe(true);
  });

  it('rejects coordinates outside valid ranges', () => {
    expect(validateGeoLocation({ latitude: 91, longitude: 0, accuracy: 10 })).toBe(false);
    expect(validateGeoLocation({ latitude: 0, longitude: 181, accuracy: 10 })).toBe(false);
  });
});
