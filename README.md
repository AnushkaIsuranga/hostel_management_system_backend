# UniHome Backend - Hostel Management System

NestJS + MongoDB + Mongoose backend for the UniHome hostel management platform.

- Staging: `https://staging.unihome.lk` on Render
- Production: `https://api.unihome.lk` on AWS
- API base path: `/api`
- Health check: `GET /health`

## Quick Start

```bash
npm install

# Set MONGODB_URI in .env, or use the MONGODB_USERNAME /
# MONGODB_PASSWORD / MONGODB_CLUSTER_HOST / MONGODB_DB_NAME pieces.
npm run db:seed

npm run start:watch
```

Default local MongoDB URI:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/hostel_management
```

## Project Structure

```text
src/
  app.module.ts
  database/                 # Mongoose schemas, module, adapter, seed script
  auth/
  users/
  hostels/
  rooms/
  amenities/
  universities/
  student-preferences/
  interaction-events/
  config/
  common/
tests/
render.yaml
Dockerfile
```

## Database

- Type: MongoDB
- ODM: Mongoose
- Staging: MongoDB Atlas
- Production: MongoDB Atlas
- IDs: UUID-style string `id` fields are preserved for API compatibility

Useful commands:

```bash
npm run db:seed
npm run build
npm test
```

There are no Prisma migrations in the MongoDB setup. Mongoose creates indexes from the schemas at app startup.

## Environment

Staging/production can use either a full Atlas URI:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_ATLAS_CLUSTER_HOST/unihome_staging?retryWrites=true&w=majority
```

Or separate values:

```env
MONGODB_USERNAME=USERNAME
MONGODB_PASSWORD=PASSWORD
MONGODB_CLUSTER_HOST=YOUR_ATLAS_CLUSTER_HOST
MONGODB_DB_NAME=unihome_staging
```

Also configure JWT, CORS, admin bootstrap credentials, and storage variables from `.env.staging.example` or `.env.production.example`.

## Docker

```bash
docker build -t unihome-api:latest .

docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e STORAGE_DRIVER=s3 \
  -e AWS_BUCKET=hostel-production-storage \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  unihome-api:latest
```

## Deployment

Render uses `render.yaml` with `MONGODB_URI` configured in the dashboard. The container starts with `npm start`; no migration command runs before startup.

## Testing

```bash
npm test
npm run test:integration
npm run test:e2e
npm run test:all
npm run test:coverage
```

## Docs

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md)
- [DNS_SETUP.md](DNS_SETUP.md)
