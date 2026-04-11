FROM node:20-alpine

WORKDIR /app/SalesCompanion/server

# Copy package files
COPY SalesCompanion/server/package*.json ./

# Install dependencies
RUN npm ci --omit=dev --no-audit --no-fund

# Copy server code
COPY SalesCompanion/server/ .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server-firestore.js"]