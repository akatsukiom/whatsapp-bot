/**
 * Gestión del envío y recepción de mensajes
 */
const logger = require('../utils/logger');

class MessageHandler {
  constructor(client) {
    this.client = client.getClient();
  }

  /**
   * Envía un mensaje de texto
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} text - Texto del mensaje
   * @returns {Promise<Object>} - Objeto del mensaje enviado
   */
  async sendText(to, text) {
    try {
      const formattedNumber = this.formatNumber(to);
      const message = await this.client.sendMessage(formattedNumber, text);
      logger.info(`Mensaje enviado a ${formattedNumber}`);
      return message;
    } catch (error) {
      logger.error(`Error al enviar mensaje a ${to}:`, error);
      throw error;
    }
  }

  /**
   * Responde a un mensaje específico
   * @param {string} messageId - ID del mensaje a responder
   * @param {string} text - Texto de respuesta
   * @returns {Promise<Object>} - Objeto del mensaje enviado
   */
  async reply(messageId, text) {
    try {
      const message = await this.client.getMessageById(messageId);
      if (!message) {
        throw new Error(`Mensaje con ID ${messageId} no encontrado`);
      }
      
      const reply = await message.reply(text);
      logger.info(`Respuesta enviada al mensaje ${messageId}`);
      return reply;
    } catch (error) {
      logger.error(`Error al responder al mensaje ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Maneja los mensajes entrantes
   * @param {Object} message - Objeto del mensaje
   */
  async handleIncomingMessage(message) {
    const { from, body, type } = message;
    
    // Registro del mensaje recibido
    logger.info(`Mensaje recibido de ${from}: ${body} (${type})`);
    
    // Aquí puedes implementar la lógica para manejar los mensajes
    // Por ejemplo, sistema de comandos, respuestas automáticas, etc.
  }

  /**
   * Formatea un número de teléfono para asegurar que tenga el formato correcto
   * @param {string} number - Número de teléfono
   * @returns {string} - Número formateado
   */
  formatNumber(number) {
    // Eliminar espacios y caracteres especiales
    let formatted = number.replace(/\s+/g, '').replace(/[^\d]/g, '');
    
    // Asegurarse de que tiene el formato correcto para WhatsApp (con código de país)
    if (!formatted.endsWith('@c.us')) {
      formatted = `${formatted}@c.us`;
    }
    
    return formatted;
  }
}

module.exports = MessageHandler;