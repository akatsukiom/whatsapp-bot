// Configuración global del sistema
module.exports = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
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
    
    // Números de administradores (pueden controlar el bot)
    adminNumbers: ['524961436947@c.us'],
    
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
      // Umbral de similitud para coincidencias de Levenshtein
      similarityThreshold: 0.7,
      // Tiempo máximo (en horas) para mantener mensajes pendientes
      pendingMessageExpiry: 24
    }
  },
  
  // Rutas de archivos
  paths: {
    public: './public',
    learningData: './learning-data.json',
    sessions: './sessions',
    logs: './logs',
    backups: './backups'
  },
  
  // Nombres de archivos
  files: {
    learningData: 'learning-data.json',
    indexHtml: 'index.html',
    adminHtml: 'admin.html',
    errorLog: 'error.log',
    accessLog: 'access.log'
  },
  
  // Datos iniciales para el aprendizaje
  initialLearningData: {
    "responses": {
      "hola": "¡Hola! ¿En qué puedo ayudarte?",
      "buenos días": "¡Buenos días! ¿En qué puedo asistirte hoy?",
      "gracias": "De nada, estoy aquí para ayudarte.",
      "adiós": "¡Hasta pronto! Fue un placer atenderte.",
      "me interesa": "¡Excelente! Nos alegra tu interés. Por favor, cuéntanos más sobre lo que estás buscando para poder asesorarte mejor.",
      "precio": "El precio depende del modelo y las características específicas. ¿Podrías indicarnos qué modelo te interesa?",
      "información": "Claro, estaré encantado de proporcionarte la información que necesites. ¿Qué te gustaría saber específicamente?",
      "contacto": "Puedes contactarnos directamente al número 4961260597 para atención personalizada.",
      "ayuda": "¿En qué puedo ayudarte hoy? Estoy disponible para resolver tus dudas.",
      "horario": "Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 13:00.",
      "ubicación": "Puedes encontrarnos en nuestra ubicación principal. ¿Necesitas la dirección exacta?"
    },
    "mediaHandlers": {}
  },
  
  // Configuración de logs
  logging: {
    // Nivel de log (verbose, debug, info, warn, error)
    level: 'info',
    // Guardar logs en archivos
    saveToFile: true,
    // Mostrar timestamps en los logs
    showTimestamps: true,
    // Cantidad máxima de logs a mantener
    maxLogFiles: 5,
    // Tamaño máximo de archivo de log en bytes (5MB)
    maxLogSize: 5 * 1024 * 1024
  }
};