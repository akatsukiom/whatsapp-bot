// config.js

module.exports = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000
  },

// Añadir en config.js
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'tu-api-key-aquí',
    model: 'gpt-3.5-turbo',
    maxTokens: 150,
    temperature: 0.7,
    privateRedirect: true, // Si es true, siempre redirecciona al privado
    privateNumber: '4961260597', // Número al que redirigir
    privateMessage: "Gracias por tu consulta. Para brindarte una atención personalizada, por favor envíame un mensaje al privado: 4961260597"
  },

  
  // Configuración de WhatsApp
  whatsapp: {
    // Argumentos para Puppeteer
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-software-rasterizer',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content'
    ],

    // Números de administradores (pueden controlar el bot con comandos tipo !learn, !switch, etc.)
    adminNumbers: ['521234567890@c.us'],

    // Mensaje de redirección para chats privados
    redirectMessage: "Este es un bot automático. Por favor, envía tus mensajes al número 4961260597 para recibir atención personalizada. Gracias.",

    // Cuentas a inicializar
    accounts: [
      { phoneNumber: '5212345678901', sessionName: 'cuenta_principal' },
      { phoneNumber: '5209876543210', sessionName: 'cuenta_respaldo' }
    ],

    // Configuración para manejo de mensajes
    messageHandling: {
      // Tiempo en milisegundos para esperar entre envíos de mensajes
      throttleDelay: 1000,
      // Reintentos para mensajes fallidos
      maxRetries: 3,
      // Umbral de similitud para coincidencias (Levenshtein)
      similarityThreshold: 0.7,
      // Tiempo máximo (en horas) para mantener mensajes pendientes
      pendingMessageExpiry: 24
    }
  },

  // Rutas de archivos y carpetas
  paths: {
    // Montar tu carpeta "public" local
    public: './public',

    // Aquí guardaremos el archivo learning-data.json en el volumen persistente (Railway: /data)
    learningData: '/data/learning-data.json',

    // Carpeta para almacenar sesiones de WhatsApp en el volumen persistente
    sessions: '/data/sessions',

    // Opcionales (logs, backups) en carpetas locales o en /data si quieres persistirlos
    logs: './logs',
    backups: './backups'
  },

  // Nombres de archivos
  files: {
    // Nombre lógico del archivo de datos de aprendizaje
    learningData: 'learning-data.json',
    indexHtml: 'index.html',
    adminHtml: 'admin.html',
    errorLog: 'error.log',
    accessLog: 'access.log'
  },

  // Datos iniciales para el aprendizaje (respuestas por defecto)
  initialLearningData: {
    responses: {
      "hola": "¡Hola! ¿En qué puedo ayudarte?",
      "buenos días": "¡Buenos días! ¿En qué puedo asistirte hoy?",
      "gracias": "De nada, estoy aquí para ayudarte.",
      "adiós": "¡Hasta pronto! Fue un placer atenderte.",
      "información": "Claro, con gusto te proporciono la información que necesites.",
      // ... agrega más respuestas por defecto si lo deseas
    },
    mediaHandlers: {}
  },

  // Configuración de logs
  logging: {
    // Nivel de log (verbose, debug, info, warn, error)
    level: 'info',
    // Guardar logs en archivos
    saveToFile: true,
    // Mostrar timestamps en los logs
    showTimestamps: true,
    // Cantidad máxima de archivos de log a mantener
    maxLogFiles: 5,
    // Tamaño máximo de archivo de log en bytes (5MB)
    maxLogSize: 5 * 1024 * 1024
  }
};
