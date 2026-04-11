FROM node:20-alpine

WORKDIR /app

# Copy entire project
COPY . .

# Install dependencies from server directory
WORKDIR /app/server
RUN npm ci --omit=dev --no-audit --no-fund

# Expose port
EXPOSE 3311

# Start the Firestore server
CMD ["node", "server-firestore.js"]
