import { describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../src/database/database.service';

describe('DatabaseService', () => {
  it('resolves batched transaction work', async () => {
    const service = Object.create(DatabaseService.prototype) as DatabaseService;

    const result = await service.$transaction([Promise.resolve(1), Promise.resolve(2)]);

    expect(result).toEqual([1, 2]);
  });

  it('passes the service into callback transaction work', async () => {
    const service = Object.create(DatabaseService.prototype) as DatabaseService;
    const callback = vi.fn().mockResolvedValue('ok');

    const result = await service.$transaction(callback);

    expect(callback).toHaveBeenCalledWith(service);
    expect(result).toBe('ok');
  });
});
