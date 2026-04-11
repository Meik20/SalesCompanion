FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package.json ./
COPY server/package-lock.json ./

# Install dependencies (clean install)
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./

# Firebase credentials are loaded from FIREBASE_SERVICE_ACCOUNT env variable (Production)
# or from local serviceAccountKey.json file fallback (Local development)

# Expose port
EXPOSE 3000

# Start Firestore server
CMD ["node", "server-firestore.js"]
