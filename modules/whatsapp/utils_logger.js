/**
 * Utilidad para el registro de logs
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Crear directorio de logs si no existe
const logDir = path.dirname(config.logging.file);
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

// Crear logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Log a archivo
    new winston.transports.File({ 
      filename: config.logging.file,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles
    }),
    // Log a consola en modo desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  exitOnError: false
});

module.exports = logger;