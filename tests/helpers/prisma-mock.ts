import { vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

export type PrismaModelMock<TMethods extends readonly string[]> = {
  [K in TMethods[number]]: MockFn;
};

export type PrismaMock<TShape extends Record<string, readonly string[]>> = {
  [K in keyof TShape]: PrismaModelMock<TShape[K]>;
};

export function createModelMock<TMethods extends readonly string[]>(methods: TMethods): PrismaModelMock<TMethods> {
  const model = {} as PrismaModelMock<TMethods>;
  for (const method of methods) {
    model[method] = vi.fn();
  }
  return model;
}

export function createPrismaMock<TShape extends Record<string, readonly string[]>>(
  shape: TShape,
): PrismaMock<TShape> {
  const prisma = {} as PrismaMock<TShape>;
  for (const key of Object.keys(shape) as Array<keyof TShape>) {
    prisma[key] = createModelMock(shape[key]);
  }
  return prisma;
}

export function resetMockTree(value: unknown): void {
  if (!value || typeof value !== 'object') {
    return;
  }

  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (typeof entry === 'function' && 'mockReset' in entry) {
      (entry as MockFn).mockReset();
      continue;
    }
    if (entry && typeof entry === 'object') {
      resetMockTree(entry);
    }
  }
}
