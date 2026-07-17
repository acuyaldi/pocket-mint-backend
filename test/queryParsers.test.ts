import { describe, it, expect } from 'vitest';
import { scalarString, scalarInt, scalarBooleanTrue } from '../src/http/queryParsers';

// These parsers stand between Express' `req.query` (string | ParsedQs | array)
// and the services. They only enforce scalar SHAPE — the lenient month/year/limit
// clamp/default still lives in the services and is not exercised here.

describe('scalarString', () => {
  it('returns a plain string unchanged', () => {
    expect(scalarString('INCOME')).toBe('INCOME');
  });

  it('collapses an array to the scalar form of its first element', () => {
    expect(scalarString(['a', 'b'])).toBe('a');
  });

  it('returns undefined for a nested object (never "[object Object]")', () => {
    expect(scalarString({ nested: 'x' } as never)).toBeUndefined();
  });

  it('returns undefined for undefined and an empty array', () => {
    expect(scalarString(undefined)).toBeUndefined();
    expect(scalarString([])).toBeUndefined();
  });

  it('returns undefined when the first array element is itself an object', () => {
    expect(scalarString([{ x: 1 }] as never)).toBeUndefined();
  });
});

describe('scalarInt', () => {
  it('parses a numeric string', () => {
    expect(scalarInt('7')).toBe(7);
  });

  it('parses the first element of an array', () => {
    expect(scalarInt(['12', '9'])).toBe(12);
  });

  it('returns undefined for empty, non-numeric, object, and undefined inputs (never NaN)', () => {
    expect(scalarInt('')).toBeUndefined();
    expect(scalarInt('abc')).toBeUndefined();
    expect(scalarInt({ a: 1 } as never)).toBeUndefined();
    expect(scalarInt(undefined)).toBeUndefined();
  });

  it('parses a leading-numeric string the same lenient way parseInt did', () => {
    expect(scalarInt('7abc')).toBe(7);
  });
});

describe('scalarBooleanTrue', () => {
  it('is true only for the exact string "true"', () => {
    expect(scalarBooleanTrue('true')).toBe(true);
    expect(scalarBooleanTrue(['true'])).toBe(true);
  });

  it('is false for any other scalar, object, or missing value', () => {
    expect(scalarBooleanTrue('false')).toBe(false);
    expect(scalarBooleanTrue('1')).toBe(false);
    expect(scalarBooleanTrue(undefined)).toBe(false);
    expect(scalarBooleanTrue({ force: 'true' } as never)).toBe(false);
  });
});
