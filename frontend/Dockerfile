# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (context is project root, so use frontend/ prefix)
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies (include dev deps for build)
RUN npm ci

# Copy source code
COPY frontend/ .

# Accept build argument for API URL (used at build time for PUBLIC_ vars)
ARG PUBLIC_API_BASE_URL=https://api.agreedtime.com

# Create .env.production file with the build arg so Astro embeds the API URL
RUN echo "PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}" > .env.production

# Build SSR output (dist/server + dist/client)
RUN npm run build

# Production stage - run Astro SSR with Node adapter
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy package metadata for npm ci --omit=dev
COPY frontend/package.json frontend/package-lock.json ./

# Install only production dependencies for runtime
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Default binding config for Astro Node adapter
ENV PORT=4321
ENV HOST=0.0.0.0
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
