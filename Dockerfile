# Imagen base más reciente
FROM node:20-bookworm-slim

# Instalar Chromium y librerías necesarias para Puppeteer / whatsapp-web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libxss1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxrender1 \
    libxfixes3 \
    libxi6 \
    libgtk-3-0 \
    ca-certificates \
    fonts-liberation \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias primero para cache
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el resto de la aplicación
COPY . .

# Crear carpetas necesarias (por si tu código las espera)
RUN mkdir -p public routes src/handlers

# Variables de entorno para puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true \
    NODE_ENV=production \
    PORT=3000

# Exponer el puerto (ajusta según tu entrypoint, 3000 o 8000)
EXPOSE 3000

# Comando de inicio (ajusta a tu archivo principal)
CMD ["node", "src/server.js"]
