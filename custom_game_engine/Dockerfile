# MVEE — Production Dockerfile
# Multi-stage: install deps, build Vite bundle, serve with lightweight Express

FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies (monorepo root)
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts

# Copy source
COPY tsconfig.json ./
COPY .env* ./
COPY packages/ packages/
COPY demo/ demo/

# Resolve sprite symlinks — Docker COPY preserves symlinks but they may not
# resolve correctly inside the container. Replace with actual files.
RUN rm -f demo/public/assets/sprites/pixellab 2>/dev/null; \
    cp -r packages/renderer/assets/sprites/pixellab demo/public/assets/sprites/pixellab

# Build production Vite bundle (VITE_ env vars embedded at build time)
RUN cd demo && npx vite build --config vite.config.prod.ts

# --- Production stage ---
FROM node:22-slim

WORKDIR /app

# Only copy what's needed for production serving
COPY package.json package-lock.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || npm install --ignore-scripts

COPY --from=builder /app/demo/dist/ /app/demo/dist/
COPY demo/server/ demo/server/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "demo/server/production.ts"]
