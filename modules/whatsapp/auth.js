/**
 * Gestión de autenticación de WhatsApp
 */
const qrcode = require('qrcode-terminal');
const logger = require('../utils/logger');

class AuthManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Genera y muestra el código QR en la consola
   * @param {string} qr - String del código QR
   */
  displayQR(qr) {
    qrcode.generate(qr, { small: true });
    logger.info('Código QR generado en la consola. Escanee con WhatsApp');
  }

  /**
   * Guarda la sesión después de la autenticación
   * @param {Object} session - Datos de la sesión
   */
  async saveAuthSession(session) {
    try {
      await this.sessionManager.saveSession(session);
      logger.info('Sesión guardada correctamente');
    } catch (error) {
      logger.error('Error al guardar la sesión:', error);
    }
  }

  /**
   * Maneja fallos de autenticación
   * @param {Error} err - Error de autenticación
   */
  handleAuthFailure(err) {
    logger.error('Error de autenticación:', err);
    // Limpiar sesión en caso de error
    this.sessionManager.clearSession();
  }
}

module.exports = AuthManager;