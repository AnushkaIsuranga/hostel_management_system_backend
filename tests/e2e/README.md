# Playwright E2E Tests

These tests use Playwright's API testing client to verify end-to-end HTTP behavior.

## Prerequisites

1. Start the backend server (on `http://127.0.0.1:3000` by default).
2. Ensure the backend can connect to its database.

## Run

```bash
npm run test:e2e
```

To target another backend URL:

```bash
E2E_BASE_URL=http://127.0.0.1:3100 npm run test:e2e
```

PowerShell:

```powershell
$env:E2E_BASE_URL = 'http://127.0.0.1:3100'
npm run test:e2e
```
