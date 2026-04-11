FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package.json ./
COPY server/package-lock.json ./

# Install dependencies (clean install)
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./

# Copy Firebase service account key (stored in parent directory)
COPY serviceAccountKey.json ./

# Expose port
EXPOSE 3311

# Start Firestore server
CMD ["node", "server-firestore.js"]
