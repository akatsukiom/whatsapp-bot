/**
 * Configuración y manejo del cliente de WhatsApp
 */
const { Client } = require('whatsapp-web.js');
const logger = require('../utils/logger');

class WhatsAppClient {
  constructor(config, session = null) {
    this.config = config;
    
    // Configuración de opciones para el cliente
    const clientOptions = {
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'],
        ...config.puppeteer
      },
      session: session
    };

    this.client = new Client(clientOptions);
    logger.info('Cliente WhatsApp inicializado');
  }

  async initialize() {
    return this.client.initialize();
  }

  async logout() {
    return this.client.logout();
  }

  isConnected() {
    return this.client.pupPage?.isClosed() === false;
  }

  getClient() {
    return this.client;
  }
}

module.exports = WhatsAppClient;