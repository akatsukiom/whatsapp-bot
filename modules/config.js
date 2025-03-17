/**
 * Configuración general de la aplicación
 */
const path = require('path');
require('dotenv').config();

// Directorio raíz del proyecto - usar path absoluto
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
  
  // Rutas de archivos y directorios - usando path.resolve para rutas absolutas
  paths: {
    public: path.resolve(rootDir, 'public'),
    templates: path.resolve(rootDir, 'templates'),
    sessions: path.resolve(rootDir, '.wwebjs_auth'),
    logs: path.resolve(rootDir, 'logs'),
    backups: path.resolve(rootDir, 'backups')
  },
  
  // Nombres de archivos - usando path.resolve para rutas absolutas 
  files: {
    indexHtml: 'index.html',
    adminHtml: 'admin.html',
    learningData: path.resolve(rootDir, 'learning-data.json'),
    errorLog: path.join(rootDir, 'logs', 'error.log'),
    accessLog: path.join(rootDir, 'logs', 'access.log')
  },
  
  // Configuración inicial de datos de aprendizaje
  initialLearningData: {
    responses: {},
    mediaHandlers: {}
  },
  
  // Configuración de logging
  logging: {
    saveToFile: true,
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // Configuración de OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '150'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    privateRedirect: process.env.PRIVATE_REDIRECT !== 'false', // true por defecto a menos que sea explícitamente 'false'
    privateNumber: process.env.PRIVATE_NUMBER || '4961260597', // número privado para redirección
    privateMessage: process.env.PRIVATE_MESSAGE || 'Tu mensaje ha sido enviado a un chat privado. Responderemos pronto.'
  }
};