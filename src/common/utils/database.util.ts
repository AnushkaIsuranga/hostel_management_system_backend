export function decimalToNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

export function parseJsonStringArray(input?: string | null): string[] {
  if (!input) {
    return [];
  }

  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function normalizeStringList(values?: string[] | null): string[] {
  if (!values?.length) {
    return [];
  }

  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}
