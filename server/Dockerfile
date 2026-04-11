FROM node:20-alpine

WORKDIR /app

# Copier uniquement package.json (pas de package-lock.json)
COPY package.json ./

# npm install génère un lock file propre — évite les conflits npm ci
RUN npm install --omit=dev --no-audit --no-fund

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3210

# Démarrer le serveur
CMD ["node", "server.js"]
