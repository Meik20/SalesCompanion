FROM node:20-alpine

# Set working directory to /app
WORKDIR /app

# Copy server package files
COPY SalesCompanion/server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm ci --omit=dev --no-audit --no-fund

# Go back to /app
WORKDIR /app

# Copy all necessary directories
COPY SalesCompanion/server ./server
COPY SalesCompanion/admin ./admin
COPY SalesCompanion/client ./client
COPY SalesCompanion/mobile ./mobile

# Set working directory back to server for CMD
WORKDIR /app/server

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server-firestore.js"]