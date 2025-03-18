/**
 * Logger simplificado para evitar problemas de configuración
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs en una ubicación fija
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configurar formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Crear logger con configuración básica
const logger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    // Log a archivo
    new winston.transports.File({ 
      filename: path.join(logDir, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    // Log a consola siempre
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  exitOnError: false
});

// Agregar métodos de conveniencia
logger.debug = logger.debug.bind(logger);
logger.info = logger.info.bind(logger);
logger.warn = logger.warn.bind(logger);
logger.error = logger.error.bind(logger);

// Sobrescribir console.log para enviar también a Socket.IO
const originalConsoleLog = console.log;
console.log = function() {
  // Mantener el comportamiento original
  originalConsoleLog.apply(console, arguments);
  
  // Convertir los argumentos a una cadena de texto
  const message = Array.from(arguments).map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  // Enviar a Socket.IO si está disponible
  if (global.io) {
    global.io.emit('consoleLog', message);
  }
};

// Sobrescribir también otros métodos de console
const originalError = console.error;
console.error = function() {
  originalError.apply(console, arguments);
  const message = `ERROR: ${Array.from(arguments).join(' ')}`;
  if (global.io) {
    global.io.emit('consoleLog', message);
  }
};

const originalWarn = console.warn;
console.warn = function() {
  originalWarn.apply(console, arguments);
  const message = `WARN: ${Array.from(arguments).join(' ')}`;
  if (global.io) {
    global.io.emit('consoleLog', message);
  }
};

// También redirigir los logs del logger de Winston a Socket.IO
logger.on('logging', (info) => {
  if (global.io) {
    const logMessage = `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
    global.io.emit('consoleLog', logMessage);
  }
});

module.exports = logger;