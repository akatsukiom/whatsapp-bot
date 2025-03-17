// Funciones auxiliares para el sistema
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Verifica que existan las carpetas necesarias y las crea si no existen
 */
function ensureDirectories() {
  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public, { recursive: true });
    log(`Carpeta ${config.paths.public} creada correctamente`, 'success');
  }
  
  // Crear carpeta sessions si no existe
  if (!fs.existsSync(config.paths.sessions)) {
    fs.mkdirSync(config.paths.sessions, { recursive: true });
    log(`Carpeta ${config.paths.sessions} creada correctamente`, 'success');
  }
  
  // Crear carpeta para logs
  if (!fs.existsSync(config.paths.logs)) {
    fs.mkdirSync(config.paths.logs, { recursive: true });
    log(`Carpeta ${config.paths.logs} creada correctamente`, 'success');
  }
  
  // Crear carpeta para backups
  if (!fs.existsSync(config.paths.backups)) {
    fs.mkdirSync(config.paths.backups, { recursive: true });
    log(`Carpeta ${config.paths.backups} creada correctamente`, 'success');
  }
  
  // Crear carpeta para archivos de datos si está en una ruta diferente
  if (config.paths.learningData) {
    const learningDataDir = path.dirname(config.paths.learningData);
    if (!fs.existsSync(learningDataDir)) {
      fs.mkdirSync(learningDataDir, { recursive: true });
      log(`Carpeta ${learningDataDir} creada correctamente`, 'success');
    }
  }
}

/**
 * Crea el archivo learning-data.json inicial si no existe
 */
function createLearningDataFile() {
  const filePath = config.paths.learningData || path.join(config.paths.public, config.files.learningData);
  
  if (!fs.existsSync(filePath)) {
    try {
      // Asegurar que el directorio existe
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(config.initialLearningData, null, 2));
      log(`Archivo ${filePath} creado correctamente`, 'success');
      return true;
    } catch (error) {
      log(`Error al crear ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }
  return false;
}

/**
 * Verifica permisos de archivos críticos
 */
function checkFilePermissions() {
  try {
    const filePath = config.paths.learningData || path.join(config.paths.public, config.files.learningData);
    
    // Intentar escribir en un archivo temporal para verificar permisos
    const testFile = `${filePath}.test`;
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    
    log('Permisos de escritura verificados correctamente', 'success');
    return true;
  } catch (error) {
    log(`Error al verificar permisos: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Guarda datos en el archivo learning-data.json
 * @param {Object} data - Datos a guardar
 */
function saveLearningData(data) {
  try {
    const filePath = config.paths.learningData || path.join(config.paths.public, config.files.learningData);
    
    // Asegurar que el directorio existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Validar que los datos sean un objeto válido antes de guardar
    if (!data || typeof data !== 'object') {
      log('Datos inválidos al intentar guardar', 'error');
      return false;
    }
    
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonData);
    log(`Datos de aprendizaje guardados correctamente (${jsonData.length} bytes)`, 'success');
    return true;
  } catch (error) {
    log(`Error al guardar datos de aprendizaje: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Carga datos del archivo learning-data.json
 * @returns {Object|null} - Datos cargados o null si hubo un error
 */
function loadLearningData() {
  try {
    const filePath = config.paths.learningData || path.join(config.paths.public, config.files.learningData);
    log(`Intentando cargar datos de aprendizaje desde: ${filePath}`, 'info');
    
    if (!fs.existsSync(filePath)) {
      log(`Archivo ${filePath} no encontrado, se creará una base de datos inicial`, 'warning');
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    
    if (!data || data.trim() === '') {
      log('Archivo vacío, se utilizarán datos por defecto', 'warning');
      return null;
    }
    
    try {
      const parsedData = JSON.parse(data);
      
      // Verificar estructura correcta
      if (!parsedData.responses) {
        log('Los datos cargados no contienen la propiedad "responses"', 'warning');
        parsedData.responses = config.initialLearningData.responses;
      }
      
      if (!parsedData.mediaHandlers) {
        log('Los datos cargados no contienen la propiedad "mediaHandlers"', 'warning');
        parsedData.mediaHandlers = config.initialLearningData.mediaHandlers;
      }
      
      log(`Datos de aprendizaje cargados con ${Object.keys(parsedData.responses).length} respuestas`, 'success');
      return parsedData;
    } catch (parseError) {
      log(`Error al analizar JSON: ${parseError.message}`, 'error');
      return null;
    }
  } catch (error) {
    log(`Error al cargar datos de aprendizaje: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Verifica si un número de WhatsApp es de grupo
 * @param {string} fromId - ID del remitente (formato: 123456789@c.us o 123456789@g.us)
 * @returns {boolean} - true si es un grupo, false si no
 */
function isGroupChat(fromId) {
  return fromId && typeof fromId === 'string' && fromId.endsWith('@g.us');
}

/**
 * Verifica si un número está en la lista de administradores
 * @param {string} number - Número a verificar (formato: 123456789@c.us)
 * @returns {boolean} - true si es administrador, false si no
 */
function isAdminNumber(number) {
  return config.whatsapp.adminNumbers.includes(number);
}

/**
 * Formatea un mensaje de log para consola
 * @param {string} message - Mensaje a formatear
 * @param {string} type - Tipo de mensaje ('info', 'error', 'success', 'warning')
 * @returns {string} - Mensaje formateado
 */
function formatLogMessage(message, type = 'info') {
  const timestamp = new Date().toLocaleString();
  const typeColors = {
    info: '\x1b[36m', // Cyan
    error: '\x1b[31m', // Red
    success: '\x1b[32m', // Green
    warning: '\x1b[33m' // Yellow
  };
  
  const color = typeColors[type] || '\x1b[37m'; // Default: white
  const reset = '\x1b[0m';
  
  return `${color}[${timestamp}] [${type.toUpperCase()}] ${message}${reset}`;
}

/**
 * Imprime un mensaje de log en la consola y opcionalmente lo guarda en archivo
 * @param {string} message - Mensaje a imprimir
 * @param {string} type - Tipo de mensaje ('info', 'error', 'success', 'warning')
 */
function log(message, type = 'info') {
  const formattedMessage = formatLogMessage(message, type);
  
  switch (type) {
    case 'error':
      console.error(formattedMessage);
      break;
    case 'warning':
      console.warn(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
  
  // Guardar log en archivo si está configurado
  if (config.logging && config.logging.saveToFile) {
    try {
      const logFileName = type === 'error' ? config.files.errorLog : config.files.accessLog;
      const logFilePath = path.join(config.paths.logs, logFileName);
      
      // Asegurar que el directorio existe
      if (!fs.existsSync(config.paths.logs)) {
        fs.mkdirSync(config.paths.logs, { recursive: true });
      }
      
      // Agregar timestamp y mensaje al archivo
      const logTime = new Date().toISOString();
      const logLine = `[${logTime}] [${type.toUpperCase()}] ${message}\n`;
      
      fs.appendFileSync(logFilePath, logLine);
    } catch (err) {
      console.error(`Error al guardar log en archivo: ${err.message}`);
    }
  }
}

/**
 * Crea una copia de seguridad del archivo de aprendizaje
 */
function backupLearningData() {
  try {
    const filePath = config.paths.learningData || path.join(config.paths.public, config.files.learningData);
    
    if (!fs.existsSync(filePath)) {
      log(`No se puede crear copia de seguridad, el archivo ${filePath} no existe`, 'warning');
      return false;
    }
    
    // Crear directorio de backup si no existe
    if (!fs.existsSync(config.paths.backups)) {
      fs.mkdirSync(config.paths.backups, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(config.paths.backups, `learning-data-${timestamp}.bak`);
    
    fs.copyFileSync(filePath, backupPath);
    log(`Copia de seguridad creada: ${backupPath}`, 'success');
    return true;
  } catch (error) {
    log(`Error al crear copia de seguridad: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Asegura que un objeto tiene la estructura correcta para el bot
 * @param {Object} data - Objeto a verificar
 * @returns {Object} - Objeto con estructura validada
 */
function ensureValidDataStructure(data) {
  const validatedData = { ...data };
  
  if (!validatedData.responses || typeof validatedData.responses !== 'object') {
    log('Estructura de datos inválida: "responses" no es un objeto', 'warning');
    validatedData.responses = { ...config.initialLearningData.responses };
  }
  
  if (!validatedData.mediaHandlers || typeof validatedData.mediaHandlers !== 'object') {
    log('Estructura de datos inválida: "mediaHandlers" no es un objeto', 'warning');
    validatedData.mediaHandlers = { ...config.initialLearningData.mediaHandlers };
  }
  
  return validatedData;
}

/**
 * Sanitiza un mensaje para evitar inyección de comandos
 * Versión mejorada con mejor manejo de caracteres especiales
 * @param {string} message - Mensaje a sanitizar
 * @returns {string} - Mensaje sanitizado
 */
function sanitizeMessage(message) {
  if (!message) return '';
  
  // Escapar los comandos para evitar inyección
  let sanitized = message
    .replace(/![a-z]+/gi, (match) => `\\${match}`)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  return sanitized;
}

module.exports = {
  ensureDirectories,
  createLearningDataFile,
  checkFilePermissions,
  saveLearningData,
  loadLearningData,
  isGroupChat,
  isAdminNumber,
  log,
  backupLearningData,
  ensureValidDataStructure,
  sanitizeMessage
};