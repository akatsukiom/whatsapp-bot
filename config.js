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
    ]
  },
  
  // Rutas de archivos
  paths: {
    public: './public',
    learningData: './learning-data.json',
    sessions: './sessions'
  },
  
  // Nombres de archivos
  files: {
    learningData: 'learning-data.json',
    indexHtml: 'index.html',
    adminHtml: 'admin.html'
  },
  
  // Datos iniciales para el aprendizaje
  initialLearningData: {
    "responses": {
      "hola": "¡Hola! ¿En qué puedo ayudarte?",
      "buenos días": "¡Buenos días! ¿En qué puedo asistirte hoy?",
      "gracias": "De nada, estoy aquí para ayudarte."
    },
    "mediaHandlers": {}
  }
};