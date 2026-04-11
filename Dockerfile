FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package.json ./
COPY server/package-lock.json ./

# Install dependencies (clean install, omit dev dependencies)
RUN npm ci --omit=dev

# Copy all server code
COPY server/ ./

# Copy Firebase config files from root if they exist
COPY serviceAccountKey.json ./

# Expose port
EXPOSE 3311

# Start the Firestore server
CMD ["node", "server-firestore.js"]
