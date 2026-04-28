import { describe, it, expect } from 'vitest';
import { decimalToNumber, parseJsonStringArray, normalizeStringList } from '../../../src/common/utils/database.util';

describe('decimalToNumber', () => {
  it('returns null for null input', () => {
    expect(decimalToNumber(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(decimalToNumber(undefined)).toBeNull();
  });

  it('converts a numeric string to number', () => {
    expect(decimalToNumber('3.14' as any)).toBe(3.14);
  });

  it('converts a plain number through', () => {
    expect(decimalToNumber(42 as any)).toBe(42);
  });

  it('converts a Decimal-like object with valueOf', () => {
    const decimal = { valueOf: () => 9.99, toString: () => '9.99' } as any;
    expect(decimalToNumber(decimal)).toBe(9.99);
  });
});

describe('parseJsonStringArray', () => {
  it('returns empty array for null', () => {
    expect(parseJsonStringArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseJsonStringArray(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseJsonStringArray('')).toEqual([]);
  });

  it('parses a valid JSON string array', () => {
    expect(parseJsonStringArray('["a","b","c"]')).toEqual(['a', 'b', 'c']);
  });

  it('filters out non-string values', () => {
    expect(parseJsonStringArray('[1, "valid", true, null]')).toEqual(['valid']);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseJsonStringArray('{bad json')).toEqual([]);
  });

  it('returns empty array for a JSON object (not array)', () => {
    expect(parseJsonStringArray('{"key":"value"}')).toEqual([]);
  });
});

describe('normalizeStringList', () => {
  it('returns empty array for null', () => {
    expect(normalizeStringList(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeStringList(undefined)).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(normalizeStringList([])).toEqual([]);
  });

  it('trims whitespace from each value', () => {
    expect(normalizeStringList(['  foo  ', ' bar '])).toEqual(['foo', 'bar']);
  });

  it('removes duplicate entries', () => {
    expect(normalizeStringList(['a', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('filters out empty strings after trimming', () => {
    expect(normalizeStringList(['a', '  ', 'b'])).toEqual(['a', 'b']);
  });
});
