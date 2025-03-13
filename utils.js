// Funciones auxiliares para el sistema
const fs = require('fs');
const config = require('./config');

/**
 * Verifica que existan las carpetas necesarias y las crea si no existen
 */
function ensureDirectories() {
  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public, { recursive: true });
    console.log(`Carpeta ${config.paths.public} creada correctamente`);
  }
  
  // Crear carpeta sessions si no existe
  if (!fs.existsSync(config.paths.sessions)) {
    fs.mkdirSync(config.paths.sessions, { recursive: true });
    console.log(`Carpeta ${config.paths.sessions} creada correctamente`);
  }
}

/**
 * Crea el archivo learning-data.json inicial si no existe
 */
function createLearningDataFile() {
  if (!fs.existsSync(config.files.learningData)) {
    fs.writeFileSync(config.files.learningData, JSON.stringify(config.initialLearningData, null, 2));
    console.log(`Archivo ${config.files.learningData} creado correctamente`);
    return true;
  }
  return false;
}

/**
 * Guarda datos en el archivo learning-data.json
 * @param {Object} data - Datos a guardar
 */
function saveLearningData(data) {
  try {
    fs.writeFileSync(config.files.learningData, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error al guardar datos de aprendizaje:', error);
    return false;
  }
}

/**
 * Carga datos del archivo learning-data.json
 * @returns {Object|null} - Datos cargados o null si hubo un error
 */
function loadLearningData() {
  try {
    if (fs.existsSync(config.files.learningData)) {
      const data = fs.readFileSync(config.files.learningData, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error al cargar datos de aprendizaje:', error);
    return null;
  }
}

/**
 * Verifica si un número de WhatsApp es de grupo
 * @param {string} fromId - ID del remitente (formato: 123456789@c.us o 123456789@g.us)
 * @returns {boolean} - true si es un grupo, false si no
 */
function isGroupChat(fromId) {
  return fromId.endsWith('@g.us');
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
 * Imprime un mensaje de log en la consola
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
}

module.exports = {
  ensureDirectories,
  createLearningDataFile,
  saveLearningData,
  loadLearningData,
  isGroupChat,
  isAdminNumber,
  log
};