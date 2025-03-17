/**
 * Configuración general de la aplicación
 */
const path = require('path');

module.exports = {
  // Configuración de WhatsApp
  whatsapp: {
    sessionFile: path.join(process.cwd(), '.wwebjs_auth', 'session.json'),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    },
    // Directorios para archivos multimedia
    mediaPath: path.join(process.cwd(), 'media'),
    downloadPath: path.join(process.cwd(), 'downloads')
  },
  
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(process.cwd(), 'logs', 'app.log'),
    maxSize: '10m',
    maxFiles: 5
  },
  
  // Comandos del bot
  commands: {
    prefix: '!',
    cooldown: 3000 // milisegundos
  },
  
  // Configuración de la base de datos (si la usas)
  database: {
    uri: process.env.DB_URI || 'mongodb://localhost:27017/whatsapp-bot',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Configuración de API (si expones una API)
  api: {
    enabled: true,
    auth: {
      secret: process.env.API_SECRET || 'tu-clave-secreta',
      expiresIn: '24h'
    },
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  }
};