import { describe, expect, it } from 'vitest';
import { readCredentials } from '../src/shared/validation.js';

describe('readCredentials', () => {
  it('normalises the email', () => {
    expect(readCredentials({ email: '  Me@Site.COM ', password: 'x' })).toEqual({ email: 'me@site.com', password: 'x' });
  });
  it('rejects a bad email', () => expect(() => readCredentials({ email: 'nope', password: 'x' })).toThrow(/valid email/));
  it('rejects a missing password', () => expect(() => readCredentials({ email: 'a@b.co' })).toThrow(/password/));
  it('enforces length only when asked', () => {
    expect(() => readCredentials({ email: 'a@b.co', password: 'short' }, { strongPassword: true })).toThrow(/at least 8/);
    expect(readCredentials({ email: 'a@b.co', password: 'short' }).password).toBe('short');
  });
});
