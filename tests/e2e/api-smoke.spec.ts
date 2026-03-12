import { expect, test } from '@playwright/test';

// These tests validate externally visible API behavior.
// Start the backend separately, then run: npm run test:e2e

test.describe('API e2e smoke', () => {
  test('unknown route returns 404', async ({ request }) => {
    const response = await request.get('/api/does-not-exist');

    expect(response.status()).toBe(404);
  });

  test('amenities getById rejects malformed uuid', async ({ request }) => {
    const response = await request.get('/api/amenities/not-a-uuid');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(String(body.message ?? body.detail ?? '').toLowerCase()).toContain('uuid');
  });

  test('interaction events getById rejects malformed uuid', async ({ request }) => {
    const response = await request.get('/api/interactionevents/not-a-uuid');

    expect(response.status()).toBe(400);
  });

  test('guarded delete endpoint requires auth', async ({ request }) => {
    const response = await request.delete('/api/users/11111111-1111-1111-1111-111111111111');

    expect(response.status()).toBe(401);
  });
});
