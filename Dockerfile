# syntax=docker/dockerfile:1

FROM oven/bun:1.3.5 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
# `build` runs astro, then the `postbuild` script writes .gz siblings for nginx gzip_static.
RUN bun run build

# Pinned to the nginx stable line (1.30.5) current on 2026-10-11.
FROM nginxinc/nginx-unprivileged:1.30.5-alpine AS runtime
LABEL org.opencontainers.image.title="portfolio-v2" \
      org.opencontainers.image.description="Theerakarn Maiwong portfolio (Astro static site)" \
      org.opencontainers.image.url="https://theerakarnm.dev" \
      org.opencontainers.image.source="https://github.com/theerakarnm/-theerakarn-portfolio-v2" \
      org.opencontainers.image.authors="Theerakarn Maiwong <contact@theerakarnm.dev>"
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
