# Barbaarintasan Academy - Fly.io Dockerfile
# Multi-stage build for production

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application (vite build + esbuild server bundle)
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm ls stripe 2>/dev/null || npm install stripe

# Copy built assets from builder
# dist/ contains: index.js (bundled server) and public/ (client build)
COPY --from=builder /app/dist ./dist

# Ensure course-images are in the correct location for static serving
# (Vite should copy them, but this ensures they're present)
RUN mkdir -p /app/dist/public/course-images
COPY --from=builder /app/client/public/course-images ./dist/public/course-images

# Copy static assets needed at runtime
COPY --from=builder /app/attached_assets ./attached_assets

# Create TTS audio temp directory
RUN mkdir -p /app/tts-audio

# Expose port (Fly.io uses 8080 by default)
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
