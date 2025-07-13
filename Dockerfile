# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build both server and Next.js applications
# BASE_PATH can be overridden at runtime, but we need a default for build
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
RUN npm run build:all

# Verify build outputs exist
RUN ls -la dist/ || (echo "Server build failed - no dist directory" && exit 1)
RUN ls -la src/web/.next/ || (echo "Next.js build failed - no .next directory" && exit 1)

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mudapp -u 1001

# Set working directory
WORKDIR /app

# Accept BASE_PATH as build argument and set as environment variable
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built server application from builder stage
COPY --from=builder --chown=mudapp:nodejs /app/dist ./dist

# Copy web source files and built Next.js application
COPY --from=builder --chown=mudapp:nodejs /app/src/web ./src/web
COPY --from=builder --chown=mudapp:nodejs /app/src/web/.next ./src/web/.next
COPY --from=builder --chown=mudapp:nodejs /app/next.config.js ./
COPY --from=builder --chown=mudapp:nodejs /app/tailwind.config.js ./
COPY --from=builder --chown=mudapp:nodejs /app/postcss.config.js ./

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown -R mudapp:nodejs /app/data && chmod 755 /app/data

# Set production environment
ENV NODE_ENV=production

# Switch to non-root user
USER mudapp

# Expose the application port
EXPOSE 3000

# Health check - respects BASE_PATH environment variable
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const basePath = process.env.BASE_PATH || ''; require('http').get(\`http://localhost:3000\${basePath}/api/health\`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application (pre-built, no need to rebuild)
CMD ["npm", "start"]