/**
 * Gestión de sesiones de WhatsApp
 */
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class SessionManager {
  constructor(config) {
    this.sessionFile = config.sessionFile || path.join(process.cwd(), '.wwebjs_auth', 'session.json');
    this.sessionDir = path.dirname(this.sessionFile);
  }

  /**
   * Obtiene la sesión guardada
   * @returns {Promise<Object|null>} Datos de la sesión o null
   */
  async getSession() {
    try {
      // Verificar si el directorio existe, si no, crearlo
      try {
        await fs.access(this.sessionDir);
      } catch (error) {
        await fs.mkdir(this.sessionDir, { recursive: true });
        logger.info(`Directorio de sesión creado: ${this.sessionDir}`);
        return null;
      }

      // Verificar si el archivo de sesión existe
      try {
        await fs.access(this.sessionFile);
      } catch (error) {
        return null;
      }

      // Leer la sesión
      const sessionData = await fs.readFile(this.sessionFile, 'utf8');
      return JSON.parse(sessionData);
    } catch (error) {
      logger.error('Error al obtener la sesión:', error);
      return null;
    }
  }

  /**
   * Guarda los datos de la sesión
   * @param {Object} session - Datos de la sesión
   */
  async saveSession(session) {
    try {
      // Asegurarse de que el directorio existe
      await fs.mkdir(this.sessionDir, { recursive: true });
      
      // Guardar datos de la sesión
      await fs.writeFile(this.sessionFile, JSON.stringify(session), 'utf8');
      logger.info('Sesión guardada exitosamente');
    } catch (error) {
      logger.error('Error al guardar la sesión:', error);
      throw error;
    }
  }

  /**
   * Elimina la sesión guardada
   */
  async clearSession() {
    try {
      await fs.unlink(this.sessionFile);
      logger.info('Sesión eliminada exitosamente');
    } catch (error) {
      // Si el archivo no existe, no es un error
      if (error.code !== 'ENOENT') {
        logger.error('Error al eliminar la sesión:', error);
        throw error;
      }
    }
  }
}

module.exports = SessionManager;