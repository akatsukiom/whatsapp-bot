// modules/publisher.js
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

/**
 * Envía un mensaje multimedia a todos los grupos
 * @param {Object} whatsappManager - Instancia del WhatsAppManager
 * @param {string} mediaPath - Ruta al archivo multimedia (local o URL)
 * @param {string} caption - Texto del mensaje
 * @returns {Promise<Object>} - Resultado de la operación
 */
module.exports.publishToAllGroups = async (whatsappManager, mediaPath, caption) => {
  try {
    logger.info(`Iniciando publicación en grupos: ${mediaPath}`);
    
    // Verificar que el gestor de WhatsApp esté inicializado
    if (!whatsappManager) {
      throw new Error("WhatsAppManager no inicializado");
    }
    
    // Verificar cuenta activa
    if (whatsappManager.accounts.length === 0) {
      throw new Error("No hay cuentas de WhatsApp configuradas");
    }
    
    // Obtener la cuenta activa
    const activeAccount = whatsappManager.accounts.find(acc => acc.active);
    if (!activeAccount) {
      throw new Error("No hay cuentas activas disponibles");
    }
    
    if (activeAccount.status !== 'ready') {
      throw new Error(`La cuenta activa no está lista (Estado: ${activeAccount.status})`);
    }
    
    // Obtener todos los grupos
    logger.info("Obteniendo lista de grupos...");
    const chats = await activeAccount.client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    
    if (groups.length === 0) {
      throw new Error("No se encontraron grupos para enviar el mensaje");
    }
    
    logger.info(`Se encontraron ${groups.length} grupos`);
    
    // Preparar el archivo multimedia
    let media;
    if (mediaPath.startsWith('http')) {
      // Si es una URL, usamos MessageMedia.fromUrl
      logger.info(`Cargando archivo multimedia desde URL: ${mediaPath}`);
      const { MessageMedia } = require('whatsapp-web.js');
      media = await MessageMedia.fromUrl(mediaPath);
    } else {
      // Si es ruta local, verificamos que exista
      const fullPath = path.isAbsolute(mediaPath) ? mediaPath : path.join(process.cwd(), mediaPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`El archivo no existe: ${fullPath}`);
      }
      
      logger.info(`Cargando archivo multimedia local: ${fullPath}`);
      const { MessageMedia } = require('whatsapp-web.js');
      media = MessageMedia.fromFilePath(fullPath);
    }
    
    // Enviar a cada grupo
    let sentCount = 0;
    for (const group of groups) {
      try {
        await activeAccount.client.sendMessage(group.id._serialized, media, {
          caption: caption || '',
          sendMediaAsDocument: false
        });
        logger.info(`Mensaje enviado al grupo ${group.name} (${group.id._serialized})`);
        sentCount++;
      } catch (groupError) {
        logger.error(`Error al enviar al grupo ${group.name}: ${groupError.message}`);
      }
    }
    
    return {
      success: true,
      sentCount,
      totalGroups: groups.length,
      message: `Mensaje enviado a ${sentCount} de ${groups.length} grupos`
    };
  } catch (error) {
    logger.error(`Error al publicar en grupos: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
};