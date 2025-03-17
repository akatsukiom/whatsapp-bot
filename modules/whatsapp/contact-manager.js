/**
 * Gestión de contactos
 */
const logger = require('../utils/logger');

class ContactManager {
  constructor(client) {
    this.client = client.getClient();
  }

  /**
   * Obtiene todos los contactos
   * @returns {Promise<Array>} - Lista de contactos
   */
  async getAllContacts() {
    try {
      const contacts = await this.client.getContacts();
      logger.info(`Obtenidos ${contacts.length} contactos`);
      return contacts;
    } catch (error) {
      logger.error('Error al obtener contactos:', error);
      throw error;
    }
  }

  /**
   * Busca un contacto por nombre o número
   * @param {string} query - Texto a buscar
   * @returns {Promise<Array>} - Contactos encontrados
   */
  async findContact(query) {
    try {
      const contacts = await this.client.getContacts();
      const results = contacts.filter(contact => {
        // Buscar en nombre o número
        return (
          contact.name?.toLowerCase().includes(query.toLowerCase()) ||
          contact.number?.includes(query)
        );
      });
      
      logger.info(`Se encontraron ${results.length} contactos para "${query}"`);
      return results;
    } catch (error) {
      logger.error(`Error al buscar contacto "${query}":`, error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de un contacto específico
   * @param {string} number - Número de teléfono
   * @returns {Promise<Object>} - Detalles del contacto
   */
  async getContactDetail(number) {
    try {
      const formattedNumber = this.formatNumber(number);
      const contact = await this.client.getContactById(formattedNumber);
      
      if (!contact) {
        throw new Error(`Contacto ${number} no encontrado`);
      }
      
      logger.info(`Detalles del contacto ${number} obtenidos`);
      return contact;
    } catch (error) {
      logger.error(`Error al obtener detalles del contacto ${number}:`, error);
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

module.exports = ContactManager;