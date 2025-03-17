/**
 * Gestión de envío y recepción de medios
 */
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const axios = require('axios');
const logger = require('../utils/logger');

class MediaHandler {
  constructor(client) {
    this.client = client.getClient();
  }

  /**
   * Envía un archivo multimedia
   * @param {string} to - Número de teléfono o ID del chat
   * @param {string} mediaPath - Ruta al archivo o URL
   * @param {Object} options - Opciones adicionales (caption, etc)
   * @returns {Promise<Object>} - Objeto del mensaje enviado
   */
  async sendMedia(to, mediaPath, options = {}) {
    try {
      const formattedNumber = this.formatNumber(to);
      const media = await this.prepareMedia(mediaPath);
      
      const message = await this.client.sendMessage(
        formattedNumber, 
        media, 
        { caption: options.caption || '', sendMediaAsDocument: options.asDocument || false }
      );
      
      logger.info(`Media enviado a ${formattedNumber}`);
      return message;
    } catch (error) {
      logger.error(`Error al enviar media a ${to}:`, error);
      throw error;
    }
  }

  /**
   * Descarga un archivo multimedia de un mensaje
   * @param {Object} message - Objeto del mensaje
   * @param {string} downloadPath - Ruta donde guardar el archivo
   * @returns {Promise<string>} - Ruta del archivo guardado
   */
  async downloadMedia(message, downloadPath) {
    try {
      if (!message.hasMedia) {
        throw new Error('El mensaje no contiene multimedia');
      }

      const media = await message.downloadMedia();
      const extension = mime.extension(media.mimetype);
      const filename = `${message.id.id}.${extension}`;
      const filePath = path.join(downloadPath, filename);
      
      // Crear el directorio si no existe
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }
      
      // Guardar el archivo
      fs.writeFileSync(filePath, media.data, 'base64');
      logger.info(`Media guardado en: ${filePath}`);
      
      return filePath;
    } catch (error) {
      logger.error('Error al descargar media:', error);
      throw error;
    }
  }

  /**
   * Prepara un objeto de multimedia para enviar
   * @param {string} mediaPath - Ruta al archivo o URL
   * @returns {Promise<MessageMedia>} - Objeto MessageMedia
   */
  async prepareMedia(mediaPath) {
    // Verificar si es una URL
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return this.mediaFromUrl(mediaPath);
    }
    
    // Es un archivo local
    return MessageMedia.fromFilePath(mediaPath);
  }

  /**
   * Crea un objeto MessageMedia desde una URL
   * @param {string} url - URL del archivo
   * @returns {Promise<MessageMedia>} - Objeto MessageMedia
   */
  async mediaFromUrl(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'];
      const extension = mime.extension(mimeType);
      
      return new MessageMedia(
        mimeType,
        buffer.toString('base64'),
        `file.${extension}`
      );
    } catch (error) {
      logger.error(`Error al descargar media de URL ${url}:`, error);
      throw error;
    }
  }

  /**
   * Formatea un número de teléfono para asegurar que tenga el formato correcto
   * @param {string} number - Número de teléfono
   * @returns {string} - Número formateado
   */
  formatNumber(number) {
    // Eliminar espacios y caracteres especiales
    let formatted = number.replace(/\s+/g, '').replace(/[^\d]/g, '');
    
    // Asegurarse de que tiene el formato correcto para WhatsApp
    if (!formatted.endsWith('@c.us')) {
      formatted = `${formatted}@c.us`;
    }
    
    return formatted;
  }
}

module.exports = MediaHandler;