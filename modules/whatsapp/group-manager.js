/**
 * Gestión de grupos de WhatsApp
 */
const logger = require('../utils/logger');

class GroupManager {
  constructor(client) {
    this.client = client.getClient();
  }

  /**
   * Crea un nuevo grupo
   * @param {string} name - Nombre del grupo
   * @param {Array<string>} participants - Participantes (números)
   * @returns {Promise<Object>} - Información del grupo creado
   */
  async createGroup(name, participants) {
    try {
      // Formatear números de participantes
      const formattedParticipants = participants.map(p => this.formatNumber(p));
      
      // Crear el grupo
      const result = await this.client.createGroup(name, formattedParticipants);
      logger.info(`Grupo "${name}" creado con ${participants.length} participantes`);
      return result;
    } catch (error) {
      logger.error(`Error al crear grupo "${name}":`, error);
      throw error;
    }
  }

  /**
   * Obtiene todos los grupos
   * @returns {Promise<Array>} - Lista de grupos
   */
  async getAllGroups() {
    try {
      const chats = await this.client.getChats();
      const groups = chats.filter(chat => chat.isGroup);
      
      logger.info(`Obtenidos ${groups.length} grupos`);
      return groups;
    } catch (error) {
      logger.error('Error al obtener grupos:', error);
      throw error;
    }
  }

  /**
   * Añade participantes a un grupo
   * @param {string} groupId - ID del grupo
   * @param {Array<string>} participants - Participantes a añadir
   * @returns {Promise<boolean>} - Éxito o fracaso
   */
  async addParticipants(groupId, participants) {
    try {
      const chat = await this.client.getChatById(groupId);
      
      if (!chat.isGroup) {
        throw new Error('El ID proporcionado no corresponde a un grupo');
      }
      
      // Formatear números de participantes
      const formattedParticipants = participants.map(p => this.formatNumber(p));
      
      // Añadir participantes
      await chat.addParticipants(formattedParticipants);
      logger.info(`${participants.length} participantes añadidos al grupo ${groupId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error al añadir participantes al grupo ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Elimina participantes de un grupo
   * @param {string} groupId - ID del grupo
   * @param {Array<string>} participants - Participantes a eliminar
   * @returns {Promise<boolean>} - Éxito o fracaso
   */
  async removeParticipants(groupId, participants) {
    try {
      const chat = await this.client.getChatById(groupId);
      
      if (!chat.isGroup) {
        throw new Error('El ID proporcionado no corresponde a un grupo');
      }
      
      // Formatear números de participantes
      const formattedParticipants = participants.map(p => this.formatNumber(p));
      
      // Eliminar participantes
      await chat.removeParticipants(formattedParticipants);
      logger.info(`${participants.length} participantes eliminados del grupo ${groupId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error al eliminar participantes del grupo ${groupId}:`, error);
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

module.exports = GroupManager;