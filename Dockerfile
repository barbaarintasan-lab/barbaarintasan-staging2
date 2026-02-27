# Barbaarintasan Academy - Fly.io Dockerfile
# Multi-stage build for production

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (need postinstall scripts for esbuild/vite binaries)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application (vite build + esbuild server bundle)
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts && npm ls stripe 2>/dev/null || npm install stripe

# Copy bcrypt native bindings from builder (--ignore-scripts skips node-pre-gyp download)
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt

# Copy built assets from builder
# dist/ contains: index.js (bundled server) and public/ (client build)
COPY --from=builder /app/dist ./dist

# Ensure course-images directory exists for static serving
RUN mkdir -p /app/dist/public/course-images

# Copy attached_assets if they exist (logo, icons etc)
COPY --from=builder /app/attached_assets ./attached_assets

# Copy scripts directory for CLI tools (e.g., translation-manager.js)
COPY --from=builder /app/scripts ./scripts

# Create TTS audio temp directory
RUN mkdir -p /app/tts-audio

# Expose port (Fly.io uses 8080 by default)
EXPOSE 8080

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
