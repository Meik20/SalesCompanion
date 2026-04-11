FROM node:20-alpine

WORKDIR /app

# Copy all package files first (for better layer caching)
COPY SalesCompanion/server/package*.json ./SalesCompanion/server/

# Install dependencies (cached layer)
RUN cd SalesCompanion/server && npm ci --omit=dev --no-audit --no-fund

# Copy server code
COPY SalesCompanion/server/ ./SalesCompanion/server/

# Copy static files (admin, client, mobile)
COPY SalesCompanion/admin ./SalesCompanion/admin
COPY SalesCompanion/client ./SalesCompanion/client
COPY SalesCompanion/mobile ./SalesCompanion/mobile

# Working directory remains in server
WORKDIR /app/SalesCompanion/server

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server-firestore.js"]