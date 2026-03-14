# =============================================================================
# Hushh Tech Website — Multi-stage Dockerfile for GCP Cloud Run
# 
# Stage 1 (builder): Installs deps + runs Vite build
# Stage 2 (runtime): Lightweight Express server serving the SPA
# =============================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source files needed for Vite build
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tailwind.config.js postcss.config.js ./
COPY src/ src/
COPY public/ public/
COPY files/ files/
COPY custom.d.ts ./

# Build the Vite app (skip tests — test files excluded by .dockerignore)
RUN npx vite build

# --- Stage 2: Runtime ---
FROM node:20-alpine

WORKDIR /app

# Install server-side dependencies only
COPY package-server.json package.json
RUN npm install --omit=dev --no-audit --no-fund

# Copy built assets from builder stage
COPY --from=builder /app/dist dist/

# Copy server and API routes
COPY server.js ./
COPY api/ api/

# Cloud Run expects port 8080
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start the Express server
CMD ["node", "server.js"]
