import { beforeEach } from 'vitest';

/**
 * Creates a shared context object whose `prisma` and `service` properties
 * are re-assigned before every test via a scoped `beforeEach`.
 * Because the *object reference* never changes, tests can destructure it
 * at the top level and still get fresh instances:
 *
 *   const ctx = withServiceHarness(() => makePrisma(), (p) => new FooService(p as any));
 *   it('...', async () => {
 *     ctx.prisma.foo.findFirst.mockResolvedValue(data);
 *     const result = await ctx.service.getAll();
 *   });
 */
export function withServiceHarness<TPrisma, TService>(
  createPrisma: () => TPrisma,
  createService: (prisma: TPrisma) => TService,
): { prisma: TPrisma; service: TService } {
  const ctx = { prisma: null as unknown as TPrisma, service: null as unknown as TService };

  beforeEach(() => {
    ctx.prisma = createPrisma();
    ctx.service = createService(ctx.prisma);
  });

  return ctx;
}
