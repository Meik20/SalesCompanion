FROM node:20-alpine

WORKDIR /app

# Copier package files
COPY package.json ./

# npm install génère un lock file propre
RUN npm install --omit=dev --no-audit --no-fund

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3311

# Démarrer le serveur Firestore
CMD ["node", "server-firestore.js"]
