FROM node:20-alpine

WORKDIR /app

# Copy root-level Firebase config files
COPY serviceAccountKey.json ./

# Copy server directory
COPY server/ ./server/

# Install dependencies from server directory
WORKDIR /app/server
RUN npm ci --omit=dev --no-audit --no-fund

# Expose port
EXPOSE 3311

# Start the Firestore server
CMD ["node", "server-firestore.js"]
