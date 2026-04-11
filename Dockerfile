FROM node:20-alpine

WORKDIR /app

# Copy package files FIRST (meilleur cache)
COPY SalesCompanion/server/package*.json ./SalesCompanion/server/

# Install dependencies
WORKDIR /app/SalesCompanion/server
RUN npm ci --omit=dev --no-audit --no-fund

# Copy the rest of the code
COPY SalesCompanion/server/ .

# Firebase credentials are loaded from FIREBASE_SERVICE_ACCOUNT env variable (Production)
# Set in Railway: Environment Variables → FIREBASE_SERVICE_ACCOUNT
# For local development: set FIREBASE_SERVICE_ACCOUNT or provide serviceAccountKey.json

# Expose port (Railway utilise process.env.PORT)
EXPOSE 3000

# Start server
CMD ["node", "server-firestore.js"]