FROM oven/bun:1.3.14 AS bun

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN node scripts/copy-assets.ts && node node_modules/next/dist/bin/next build

FROM node:24-bookworm-slim AS production-dependencies
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --chown=node:node --from=build /app/package.json ./
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/.next ./.next
COPY --chown=node:node --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
