# MVEE — Production Dockerfile
# Multi-stage: install deps, build Vite bundle, serve with lightweight Express

FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies (monorepo workspaces — copy all package.json first for layer caching)
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/renderer/package.json packages/renderer/
COPY packages/botany/package.json packages/botany/
COPY packages/world/package.json packages/world/
COPY packages/persistence/package.json packages/persistence/
COPY packages/metrics/package.json packages/metrics/
COPY packages/metrics-dashboard/package.json packages/metrics-dashboard/
COPY packages/reproduction/package.json packages/reproduction/
COPY packages/divinity/package.json packages/divinity/
COPY packages/magic/package.json packages/magic/
COPY packages/llm/package.json packages/llm/
COPY packages/shared-worker/package.json packages/shared-worker/
COPY packages/agents/package.json packages/agents/
COPY packages/language/package.json packages/language/
COPY packages/introspection/package.json packages/introspection/
COPY packages/environment/package.json packages/environment/
COPY packages/navigation/package.json packages/navigation/
COPY packages/building-designer/package.json packages/building-designer/
COPY packages/hierarchy-simulator/package.json packages/hierarchy-simulator/
COPY packages/city-simulator/package.json packages/city-simulator/
COPY packages/deterministic-sprite-generator/package.json packages/deterministic-sprite-generator/
COPY packages/types/package.json packages/types/
COPY demo/package.json demo/
RUN npm install --ignore-scripts

# Copy source
COPY tsconfig.json ./
COPY .env* ./
COPY packages/ packages/
COPY demo/ demo/
COPY data/ data/

# Resolve sprite symlinks — Docker COPY preserves symlinks but they point to
# absolute paths on the dev machine. Remove broken ones, replace pixellab with real files.
RUN rm -rf demo/public/assets/sprites/pixellab demo/public/assets/sprites/species demo/public/assets/sprites/map_objects 2>/dev/null; \
    cp -r packages/renderer/assets/sprites/pixellab demo/public/assets/sprites/pixellab 2>/dev/null; \
    mkdir -p demo/public/assets/sprites/species demo/public/assets/sprites/map_objects

# Accept VITE_ env vars as build args so they get baked into the Vite bundle
ARG VITE_SENTRY_DSN
ARG VITE_LLM_PROXY_URL
ARG VITE_GROQ_API_KEY
ARG VITE_GROQ_MODEL
ARG VITE_CEREBRAS_API_KEY
ARG VITE_CEREBRAS_MODEL
ARG VITE_USE_SHARED_WORKER

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
COPY demo/src/universe-api.ts demo/src/multiverse-storage.ts demo/src/planet-storage.ts demo/src/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "demo/server/production.ts"]
