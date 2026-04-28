# Unit Tests — Hostel Management System Backend

## Overview

This directory contains unit tests for all service classes in the application. Tests are written with **Vitest** and use in-memory mocks for all external dependencies (database, JWT, argon2). No real database or network connections are made.

**Total: 145 tests across 11 test files — all passing.**

---

## Running Tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on file change)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

Coverage output is written to `coverage/` and printed to the console. The configured threshold is **80%** for lines, functions, branches, and statements.

---

## Coverage Configuration

Defined in [`vitest.config.ts`](../../vitest.config.ts) at the project root.

| Metric     | Threshold |
|------------|-----------|
| Lines      | 80%       |
| Functions  | 80%       |
| Branches   | 80%       |
| Statements | 80%       |

Coverage is collected from the explicitly listed files in [vitest.config.ts](../../vitest.config.ts):

- `src/common/enums/app.enums.ts`
- `src/common/exceptions/app-exception.ts`
- `src/common/utils/database.util.ts`
- `src/auth/auth.service.ts`
- `src/users/users.service.ts`
- `src/amenities/amenities.service.ts`
- `src/rooms/rooms.service.ts`
- `src/universities/universities.service.ts`
- `src/hostels/listings/hostel-listings.service.ts`
- `src/hostels/reviews/hostel-reviews.service.ts`
- `src/hostels/verification/hostel-verification.service.ts`
- `src/hostels/subscriptions/hostel-subscriptions.service.ts`
- `src/hostels/amenities/hostel-amenities.service.ts`

This keeps the threshold aligned with the current unit-test suite and avoids counting unrelated, currently untested modules.

---

## Mock Strategy

All tests follow a consistent approach:

- **Prisma** — replaced with a plain object whose methods are `vi.fn()` mocks (`makePrisma()` factory per file).
- **JwtService** — mock with `signAsync: vi.fn().mockResolvedValue('signed-token')`.
- **argon2** — module-level mock via `vi.mock('argon2', ...)`.
- **AppConfigService** — plain object with the config values needed.
- **No NestJS DI** — services are instantiated directly with `new ServiceClass(prisma as any, ...)`.

This keeps tests fast, isolated, and free of framework overhead.

---

## Test File Inventory

### `common/database.util.spec.ts` — 18 tests
Tests the pure utility functions in `src/common/utils/database.util.ts`.

| Function | Cases |
|---|---|
| `decimalToNumber` | null → null, Decimal → number, number passthrough |
| `parseJsonStringArray` | null → [], valid JSON array, invalid JSON → [], non-array JSON → [] |
| `normalizeStringList` | null → [], comma-separated, trims whitespace, deduplicates, filters blanks |

---

### `auth/auth.service.spec.ts` — 14 tests
Tests `src/auth/auth.service.ts`.

| Method | Cases |
|---|---|
| `login` | valid student → tokens, user not found → 401, wrong password → 401 |
| `refresh` | valid token → new tokens, empty/missing → 401, not found → 401, revoked → 401, expired → 401, admin idle timeout → 401 |
| `logout` | valid token (revokes), null (no-op), empty string (no-op) |
| `register` | new user → tokens, duplicate email → 409 |

---

### `users/users.service.spec.ts` — 18 tests
Tests `src/users/users.service.ts`.

| Method | Cases |
|---|---|
| `getAll` | returns list, empty list |
| `getById` | found, not found → 404 |
| `update` | own profile, not found → 404, admin override |
| `delete` | own account, not found → 404, admin override |
| `getStats` | returns totals + 7-day counts for hostels, users, reviews |
| `getByRole` | valid role name, valid numeric role, invalid role → 400 |

---

### `amenities/amenities.service.spec.ts` — 12 tests
Tests `src/amenities/amenities.service.ts`.

| Method | Cases |
|---|---|
| `getAll` | returns list, empty list |
| `getById` | found, not found → 404 |
| `create` | success, duplicate → 409 |
| `update` | success, not found → 404 |
| `delete` | success, not found → 404 |

---

### `rooms/rooms.service.spec.ts` — 10 tests
Tests `src/rooms/rooms.service.ts`.

| Method | Cases |
|---|---|
| `getAll` | returns rooms |
| `getById` | found, not found → 404 |
| `create` | success, hostel not found → 404 |
| `update` | success, not found → 404 |
| `delete` | success (soft-delete), not found → 404 |

---

### `universities/universities.service.spec.ts` — 11 tests
Tests `src/universities/universities.service.ts`.

| Method | Cases |
|---|---|
| `getAll` | returns list, empty list |
| `getById` | found, not found → 404 |
| `create` | success, duplicate → 409 |
| `update` | success, not found → 404 |
| `delete` | success (soft-delete check), not found → 404 |

---

### `hostels/hostel-listings.service.spec.ts` — 11 tests
Tests `src/hostels/listings/hostel-listings.service.ts`.

| Method | Cases |
|---|---|
| `getAll` | returns listings, empty, with filters |
| `getById` | found, not found → 404 |
| `create` | success, not owner → 403 |
| `update` | own hostel, not found → 404, forbidden → 403 |
| `delete` | success, not found → 404 |

---

### `hostels/hostel-reviews.service.spec.ts` — 17 tests
Tests `src/hostels/reviews/hostel-reviews.service.ts`.

| Method | Cases |
|---|---|
| Validation | rating < 1 → 400, rating > 5 → 400 |
| `getForHostel` | returns reviews, hostel not found → 404 |
| `getSummary` | with reviews (avg/count), no reviews (null avg), hostel not found → 404 |
| `create` | success, invalid user → 401, duplicate → 409 |
| `update` | own review, not found → 404, non-owner → 403, admin override |
| `delete` | own review, not found → 404, non-owner → 403 |

---

### `hostels/hostel-verification.service.spec.ts` — 12 tests
Tests `src/hostels/verification/hostel-verification.service.ts`.

| Method | Cases |
|---|---|
| `requestVerification` | success, not owner → 403, pending already exists → 409 |
| `approveVerification` | success, not found → 404, not pending → 400 |
| `rejectVerification` | success, not found → 404, not pending → 400 |
| `getForHostel` | admin access (no ownership check), owner access, non-owner → 403 |

---

### `hostels/hostel-subscriptions.service.spec.ts` — 9 tests
Tests `src/hostels/subscriptions/hostel-subscriptions.service.ts`.

| Method | Cases |
|---|---|
| `upsert` | expiry ≤ start → 400, hostel not found → 404, create new, update existing |
| `get` | found, null (no subscription), hostel not found → 404 |
| `processExpirationsAndReminders` | processes expired (marks inactive + hostel expired), no-op when empty |

---

### `hostels/hostel-amenities.service.spec.ts` — 13 tests
Tests `src/hostels/amenities/hostel-amenities.service.ts`.

| Method | Cases |
|---|---|
| `getAll` | returns list, empty list |
| `getByKey` | found, null |
| `create` | success, conflict → 409 |
| `createByNames` | missing hostelId → 400, empty names → 400, hostel not found → 404, creates missing amenities + links, returns existing links without duplicating |
| `delete` | success, not found → 404 |

---

## Exception Reference

All service methods throw typed exceptions from `src/common/exceptions/app-exception.ts`:

| Class | HTTP Status | Used When |
|---|---|---|
| `AppNotFoundException` | 404 | Resource not found |
| `AppConflictException` | 409 | Duplicate resource |
| `AppForbiddenException` | 403 | Insufficient permissions |
| `AppBadRequestException` | 400 | Invalid input |
| `AppUnauthorizedException` | 401 | Authentication failure |
