import { describe, expect, it } from 'vitest';
import { bad, HttpError, intParam, slugify, uniqueSlug } from '../src/utils.js';
import { NICHES } from '../src/niches.js';

describe('slugify', () => {
  it('lowercases, strips accents and joins with dashes', () => {
    expect(slugify('Héllo, World!')).toBe('hello-world');
  });
  it('falls back when nothing usable is left', () => expect(slugify('!!!')).toBe('story'));
  it('slugifies every niche to a clean tab slug', () => {
    expect(NICHES.map(slugify)).toEqual(['business', 'career', 'technology', 'investment', 'finance']);
  });
});

describe('uniqueSlug', () => {
  it('adds a random suffix', () => {
    expect(uniqueSlug('Same title')).toMatch(/^same-title-[0-9a-f]{6}$/);
    expect(uniqueSlug('Same title')).not.toBe(uniqueSlug('Same title'));
  });
});

describe('intParam', () => {
  it('parses numbers and falls back otherwise', () => {
    expect(intParam('3', 1)).toBe(3);
    expect(intParam('abc', 7)).toBe(7);
    expect(intParam(undefined, 9)).toBe(9);
  });
});

describe('errors', () => {
  it('bad() is a 400 HttpError', () => {
    const e = bad('nope');
    expect(e).toBeInstanceOf(HttpError);
    expect(e.status).toBe(400);
  });
});
