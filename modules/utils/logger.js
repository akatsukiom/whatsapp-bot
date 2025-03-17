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

module.exports = logger;