/**
 * Configuración y manejo de eventos de WhatsApp
 */
const logger = require('../utils/logger');

class EventHandler {
  constructor(client) {
    this.client = client.getClient();
  }

  /**
   * Configura los manejadores de eventos para el cliente
   * @param {Object} handlers - Objeto con funciones manejadoras para cada evento
   */
  setupEvents(handlers) {
    // Evento: Código QR
    this.client.on('qr', (qr) => {
      logger.info('QR Code recibido');
      
      if (typeof handlers.onQR === 'function') {
        handlers.onQR(qr);
      }
    });

    // Evento: Autenticación exitosa
    this.client.on('authenticated', (session) => {
      logger.info('Cliente autenticado');
      
      if (typeof handlers.onAuthenticated === 'function') {
        handlers.onAuthenticated(session);
      }
    });

    // Evento: Autenticación fallida
    this.client.on('auth_failure', (error) => {
      logger.error('Fallo en la autenticación:', error);
      
      if (typeof handlers.onAuthFailure === 'function') {
        handlers.onAuthFailure(error);
      }
    });

    // Evento: Cliente listo
    this.client.on('ready', () => {
      logger.info('Cliente listo');
      
      if (typeof handlers.onReady === 'function') {
        handlers.onReady();
      }
    });

    // Evento: Cliente desconectado
    this.client.on('disconnected', (reason) => {
      logger.warn(`Cliente desconectado: ${reason}`);
      
      if (typeof handlers.onDisconnected === 'function') {
        handlers.onDisconnected(reason);
      }
    });

    // Evento: Mensaje recibido
    this.client.on('message', (message) => {
      if (typeof handlers.onMessage === 'function') {
        handlers.onMessage(message);
      }
    });

    // Evento: Mensaje eliminado
    this.client.on('message_revoke_everyone', (after, before) => {
      logger.info('Mensaje eliminado por alguien');
      
      if (typeof handlers.onMessageDeleted === 'function') {
        handlers.onMessageDeleted(after, before);
      }
    });

    // Evento: Cambio de estado de conexión del grupo
    this.client.on('group_join', (notification) => {
      logger.info(`Alguien se unió al grupo: ${notification.chatId}`);
      
      if (typeof handlers.onGroupJoin === 'function') {
        handlers.onGroupJoin(notification);
      }
    });

    // Evento: Salida del grupo
    this.client.on('group_leave', (notification) => {
      logger.info(`Alguien salió del grupo: ${notification.chatId}`);
      
      if (typeof handlers.onGroupLeave === 'function') {
        handlers.onGroupLeave(notification);
      }
    });

    logger.info('Eventos de WhatsApp configurados correctamente');
  }
}

module.exports = EventHandler;