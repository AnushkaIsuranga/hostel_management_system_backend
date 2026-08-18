# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN mkdir -p /app/wwwroot/uploads


FROM gcr.io/distroless/nodejs20-debian12:nonroot

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /app/package.json .
COPY --from=builder --chown=nonroot:nonroot /app/package-lock.json .
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/wwwroot ./wwwroot

EXPOSE 3000

CMD ["dist/main.js"]
