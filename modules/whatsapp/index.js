/**
 * Módulo principal que integra todas las funcionalidades de WhatsApp
 */
const WhatsAppClient = require('./client');
const AuthManager = require('./auth');
const MessageHandler = require('./message-handler');
const MediaHandler = require('./media-handler');
const ContactManager = require('./contact-manager');
const GroupManager = require('./group-manager');
const SessionManager = require('./session-manager');
const EventHandler = require('./events');
const logger = require('../utils/logger');

class WhatsAppManager {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isReady = false;
    
    // Inicializar gestores
    this.sessionManager = new SessionManager(config);
    this.auth = new AuthManager(this.sessionManager);
  }

  async initialize() {
    try {
      logger.info('Inicializando WhatsApp Manager...');
      
      // Inicializar cliente con sesión previa si existe
      const session = await this.sessionManager.getSession();
      this.client = new WhatsAppClient(this.config, session);
      
      // Inicializar los manejadores con el cliente
      this.messageHandler = new MessageHandler(this.client);
      this.mediaHandler = new MediaHandler(this.client);
      this.contactManager = new ContactManager(this.client);
      this.groupManager = new GroupManager(this.client);
      this.eventHandler = new EventHandler(this.client);

      // Configurar eventos del cliente
      this.eventHandler.setupEvents({
        onAuthenticated: this.handleAuthentication.bind(this),
        onQR: this.handleQR.bind(this),
        onReady: this.handleReady.bind(this),
        onDisconnected: this.handleDisconnect.bind(this),
        onMessage: this.messageHandler.handleIncomingMessage.bind(this.messageHandler)
      });

      // Inicializar cliente
      await this.client.initialize();
      
      return this;
    } catch (error) {
      logger.error('Error al inicializar WhatsApp Manager:', error);
      throw error;
    }
  }

  async handleAuthentication(session) {
    await this.sessionManager.saveSession(session);
    logger.info('Sesión de WhatsApp guardada exitosamente');
  }

  async handleQR(qr) {
    logger.info('QR Code generado, escanee con su dispositivo');
    // Aquí puedes implementar lógica adicional como enviar QR por correo o mostrarlo en interfaz
  }

  handleReady() {
    this.isReady = true;
    logger.info('WhatsApp Manager está listo para usarse');
  }

  handleDisconnect(reason) {
    this.isReady = false;
    logger.warn(`WhatsApp Manager desconectado: ${reason}`);
  }

  // Métodos públicos que exponen funcionalidad de los módulos
  
  async sendTextMessage(to, text) {
    return this.messageHandler.sendText(to, text);
  }

  async sendMedia(to, mediaPath, options = {}) {
    return this.mediaHandler.sendMedia(to, mediaPath, options);
  }

  async getContacts() {
    return this.contactManager.getAllContacts();
  }

  async createGroup(name, participants) {
    return this.groupManager.createGroup(name, participants);
  }
  
  async logout() {
    await this.client.logout();
    await this.sessionManager.clearSession();
    this.isReady = false;
    logger.info('Sesión de WhatsApp cerrada y eliminada');
  }

  getStatus() {
    return {
      isReady: this.isReady,
      phoneConnected: this.client?.isConnected() || false
    };
  }
}

module.exports = WhatsAppManager;