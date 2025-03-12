FROM node:16

# Instalar dependencias de Chromium
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    libgbm1 \
    libvulkan1

# Instalar dependencias adicionales para Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-browser \
    chromium-driver

# Crear directorio para la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de Node
RUN npm install

# Copiar el código de la aplicación
COPY . .

# Puerto que expone la aplicación
EXPOSE 8080

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Comando para iniciar la aplicación
CMD ["node", "index.js"]