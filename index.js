/**
 * Configuración general de la aplicación
 */
const path = require('path');
require('dotenv').config();

// Directorio raíz del proyecto
const rootDir = process.cwd();

module.exports = {
  // Configuración de WhatsApp
  whatsapp: {
    sessionFile: path.join(rootDir, '.wwebjs_auth', 'session.json'),
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
    mediaPath: path.join(rootDir, 'media'),
    downloadPath: path.join(rootDir, 'downloads'),
    reconnectInterval: 30000, // 30 segundos
    maxReconnectAttempts: 5
  },
  
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // Configuración de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(rootDir, 'logs', 'app.log'),
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
  },
  
  // Rutas de archivos y directorios (añadido)
  paths: {
    public: path.join(rootDir, 'public'),
    templates: path.join(rootDir, 'templates'),
    sessions: path.join(rootDir, 'sessions')
  },
  
  // Nombres de archivos (añadido)
  files: {
    indexHtml: 'index.html',
    adminHtml: 'admin.html',
    learningData: path.join(rootDir, 'learning-data.json')
  },
  
  // Configuración de OpenAI (añadido)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    privateRedirect: process.env.PRIVATE_REDIRECT !== 'false',
    privateMessage: process.env.PRIVATE_MESSAGE || 'Tu mensaje ha sido enviado a un chat privado. Responderemos pronto.'
  }
};