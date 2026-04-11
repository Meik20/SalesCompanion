FROM node:20-alpine

WORKDIR /app

# Copy package files FIRST (meilleur cache)
COPY server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm ci --omit=dev --no-audit --no-fund

# Copy the rest of the code
COPY server/ .

# Copy Firebase service account key to parent directory
# (server code looks for ../serviceAccountKey.json)
COPY serviceAccountKey.json ../ 

# Expose port (Railway utilise process.env.PORT)
EXPOSE 3311

# Start server
CMD ["node", "server-firestore.js"]