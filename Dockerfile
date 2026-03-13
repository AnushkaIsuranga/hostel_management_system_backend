# syntax=docker/dockerfile:1.7

# Storage abstraction note:
# When STORAGE_DRIVER=local: uses wwwroot/uploads (ephemeral, only for local dev)
# When STORAGE_DRIVER=s3: ignores wwwroot, uploads go to AWS S3

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json
COPY --from=builder --chown=nonroot:nonroot /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/prisma ./prisma
# Copy wwwroot for local storage support (ignored when STORAGE_DRIVER=s3)
COPY --from=builder --chown=nonroot:nonroot /app/wwwroot ./wwwroot

EXPOSE 3000

CMD ["prisma/startup.cjs"]