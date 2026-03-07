# ----------------------------------------
# YUA-ENGINE Cloud Run Dockerfile
# Node 20 + Production Build
# ----------------------------------------
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --force

# Copy compiled dist folder
COPY dist ./dist
COPY .env ./.env

EXPOSE 4000

CMD ["node", "dist/server/server.js"]
