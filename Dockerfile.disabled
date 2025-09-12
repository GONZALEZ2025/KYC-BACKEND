FROM node:20-alpine
WORKDIR /app

# Copiamos manifiestos
COPY package.json tsconfig.json ./

# Usar npm install (no npm ci) porque no hay package-lock.json
RUN npm install

# Copiar el código y compilar
COPY src ./src
RUN npm run build

EXPOSE 8080
CMD ["npm","start"]
