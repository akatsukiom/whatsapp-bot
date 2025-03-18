// index.js - Punto de entrada principal de la aplicación
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('./modules/utils/logger');
const publicarRoute = require('./routes/publicar');

const express = require('express');
const app = express();

// Cargar variables de entorno
dotenv.config();
app.use(express.json());

// Montar la ruta de publicación
const publicarRoute = require('./routes/publicar');
app.use('/api', publicarRoute);

// Iniciar el servidor Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});


// Asegurar que las carpetas necesarias existen
utils.ensureDirectories();

// Configuración del servidor
const setupServer = require('./server');

// Asegurar que existe la carpeta public y las plantillas HTML
try {
  if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
    logger.info(`Carpeta 'public' creada correctamente en ${path.join(__dirname, 'public')}`);
  }
  
  if (!fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
    const createIndexHtml = require('./templates/index-template');
    createIndexHtml();
    logger.info('Archivo index.html creado correctamente');
  }
  
  if (!fs.existsSync(path.join(__dirname, 'public', 'admin.html'))) {
    const createAdminHtml = require('./templates/admin-template');
    createAdminHtml();
    logger.info('Archivo admin.html creado correctamente');
  }
} catch (err) {
  console.error('Error al generar archivos HTML:', err);
  logger.error(`Error al generar archivos HTML: ${err.message}`);
}

// Asegurarnos de que existe el archivo learning-data.json
const learningDataPath = path.join(__dirname, 'learning-data.json');
if (!fs.existsSync(learningDataPath)) {
  try {
    fs.writeFileSync(
      learningDataPath, 
      JSON.stringify({ responses: {}, mediaHandlers: {} }, null, 2)
    );
    logger.info(`Archivo learning-data.json creado correctamente en ${learningDataPath}`);
  } catch (err) {
    console.error('Error al crear archivo learning-data.json:', err);
    logger.error(`Error al crear archivo learning-data.json: ${err.message}`);
  }
}

// Inicializar el manejador de IA si está configurado
if (process.env.OPENAI_API_KEY) {
  try {
    global.aiHandler = require('./ai-handler');
    logger.info('Manejador de IA inicializado correctamente');
  } catch (err) {
    console.error('Error al cargar el manejador de IA:', err);
    logger.error(`Error al cargar el manejador de IA: ${err.message}`);
  }
}

// Clase para gestionar múltiples cuentas de WhatsApp
class WhatsAppManager {
  constructor() {
    this.accounts = [];
    this.activeAccountIndex = 0;
    this.server = null;
    this.io = null;
    
    // Cargar datos de aprendizaje
    this.learningData = utils.loadLearningData() || { responses: {}, mediaHandlers: {} };
    
    // Configurar servidor
    const serverConfig = setupServer();
    this.server = serverConfig.server;
    this.io = serverConfig.io;
    
    // Hacer disponible el manager globalmente
    global.whatsappManager = this;
    
    logger.info('WhatsAppManager inicializado correctamente');
  }
  
  // Limpiar sesiones duplicadas
  async cleanupDuplicateSessions() {
    try {
      logger.info('Verificando sesiones duplicadas...');
      
      // Obtener la lista de números de teléfono únicos
      const uniquePhoneNumbers = [...new Set(this.accounts.map(a => a.phoneNumber))];
      
      // Para cada número único, conservar solo la sesión más reciente o la que esté activa
      for (const phone of uniquePhoneNumbers) {
        const accountsWithSamePhone = this.accounts.filter(a => a.phoneNumber === phone);
        
        if (accountsWithSamePhone.length > 1) {
          logger.warn(`Se encontraron ${accountsWithSamePhone.length} sesiones para el número ${phone}. Conservando solo una.`);
          
          // Verificar si alguna está conectada
          const connectedAccount = accountsWithSamePhone.find(a => 
            a.status === 'ready' || a.status === 'authenticated');
          
          if (connectedAccount) {
            // Si hay una conectada, conservar esa y eliminar las demás
            for (const account of accountsWithSamePhone) {
              if (account.sessionName !== connectedAccount.sessionName) {
                logger.info(`Eliminando sesión duplicada ${account.sessionName} para número ${phone}`);
                await this.removeAccount(account.sessionName);
              }
            }
          } else {
            // Si ninguna está conectada, ordenar por fecha y conservar la más reciente
            accountsWithSamePhone.sort((a, b) => {
              // Si tiene timestamp, usar eso, de lo contrario usar el timestamp del nombre de sesión
              const timeA = a.timestamp || parseInt(a.sessionName.split('_')[1] || 0);
              const timeB = b.timestamp || parseInt(b.sessionName.split('_')[1] || 0);
              return timeB - timeA;
            });
            
            // Conservar solo la primera (más reciente) y eliminar el resto
            for (let i = 1; i < accountsWithSamePhone.length; i++) {
              const account = accountsWithSamePhone[i];
              logger.info(`Eliminando sesión duplicada ${account.sessionName} para número ${phone}`);
              await this.removeAccount(account.sessionName);
            }
          }
        }
      }
      
      logger.info('Limpieza de sesiones duplicadas completada');
    } catch (err) {
      logger.error(`Error al limpiar sesiones duplicadas: ${err.message}`);
    }
  }
  
  // Agregar cuenta
  addAccount(phoneNumber, sessionName = '') {
    const formattedSessionName = sessionName || `cuenta_${Date.now()}`;
    
    // Evitar duplicados por nombre de sesión
    const existingSessionAccount = this.accounts.find(a => a.sessionName === formattedSessionName);
    if (existingSessionAccount) {
      logger.warn(`Ya existe una cuenta con el nombre de sesión ${formattedSessionName}`);
      return false;
    }
    
    // Evitar duplicados por número de teléfono
    const existingPhoneAccount = this.accounts.find(a => a.phoneNumber === phoneNumber);
    if (existingPhoneAccount) {
      logger.warn(`Ya existe una cuenta con el número ${phoneNumber}. No se permite duplicar números.`);
      return false;
    }
    
    try {
      logger.info(`Agregando cuenta ${phoneNumber} con sesión ${formattedSessionName}`);
      
      // Crear carpeta de autenticación si no existe
      const authPath = path.join(__dirname, '.wwebjs_auth');
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
        logger.info(`Carpeta de autenticación creada en ${authPath}`);
      }
      
      // Configurar cliente de WhatsApp
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: formattedSessionName }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer'
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        }
      });
      
      // Registrar timestamp de creación para ordenamiento posterior
      const timestamp = Date.now();
      
      // Agregar a la lista de cuentas
      this.accounts.push({
        phoneNumber,
        sessionName: formattedSessionName,
        client,
        status: 'initializing',
        active: this.accounts.length === 0, // Primera cuenta es activa por defecto
        timestamp: timestamp
      });
      
      // Configurar eventos del cliente
      this.setupClientEvents(client, phoneNumber, formattedSessionName);
      
      // Inicializar cliente
      client.initialize();
      
      return true;
    } catch (err) {
      logger.error(`Error al agregar cuenta ${phoneNumber}:`, err);
      return false;
    }
  }
  
  // Configurar eventos para un cliente
  setupClientEvents(client, phoneNumber, sessionName) {
    // Evento de código QR
    client.on('qr', async (qr) => {
      try {
        logger.info(`Código QR recibido para ${phoneNumber}`);
        
        // Actualizar estado
        const account = this.getAccountBySession(sessionName);
        if (account) {
          account.status = 'waiting';
          account.detail = 'Esperando que se escanee el código QR';
        }
        
        // Generar URL de datos del QR
        const qrDataUrl = await qrcode.toDataURL(qr);
        
        // Emitir QR al frontend
        if (this.io) {
          this.io.emit('qr', {
            sessionName,
            phoneNumber,
            qrDataUrl,
            timestamp: Date.now()
          });
          
          // Emitir estado también
          this.io.emit('status', {
            sessionName,
            phoneNumber,
            status: 'waiting',
            detail: 'Esperando que se escanee el código QR',
            progress: 40,
            active: account?.active || false
          });
        }
      } catch (err) {
        logger.error(`Error al procesar QR para ${phoneNumber}:`, err);
      }
    });
    
    // Evento de autenticación
    client.on('authenticated', () => {
      logger.info(`Cuenta ${phoneNumber} autenticada`);
      
      // Actualizar estado
      const account = this.getAccountBySession(sessionName);
      if (account) {
        account.status = 'authenticated';
        account.detail = 'Autenticado correctamente';
      }
      
      // Emitir estado
      if (this.io) {
        this.io.emit('status', {
          sessionName,
          phoneNumber,
          status: 'authenticated',
          detail: 'Autenticado correctamente',
          progress: 60,
          active: account?.active || false
        });
      }
    });
    
    // Evento de fallo de autenticación
    client.on('auth_failure', (msg) => {
      logger.error(`Error de autenticación en ${phoneNumber}: ${msg}`);
      
      // Actualizar estado
      const account = this.getAccountBySession(sessionName);
      if (account) {
        account.status = 'error';
        account.detail = `Error de autenticación: ${msg}`;
      }
      
      // Emitir estado
      if (this.io) {
        this.io.emit('status', {
          sessionName,
          phoneNumber,
          status: 'error',
          detail: `Error de autenticación: ${msg}`,
          progress: 0,
          active: account?.active || false
        });
      }
    });
    
    // Evento de cliente listo
    client.on('ready', () => {
      logger.info(`Cliente listo para ${phoneNumber}`);
      
      // Actualizar estado
      const account = this.getAccountBySession(sessionName);
      if (account) {
        account.status = 'ready';
        account.detail = 'Conectado y listo para enviar/recibir mensajes';
      }
      
      // Emitir estado
      if (this.io) {
        this.io.emit('status', {
          sessionName,
          phoneNumber,
          status: 'ready',
          detail: 'Conectado y listo para enviar/recibir mensajes',
          progress: 100,
          active: account?.active || false
        });
      }
    });
    
    // Evento de desconexión
    client.on('disconnected', (reason) => {
      logger.warn(`Cliente ${phoneNumber} desconectado: ${reason}`);
      
      // Actualizar estado
      const account = this.getAccountBySession(sessionName);
      if (account) {
        account.status = 'disconnected';
        account.detail = `Desconectado: ${reason}`;
      }
      
      // Emitir estado
      if (this.io) {
        this.io.emit('status', {
          sessionName,
          phoneNumber,
          status: 'disconnected',
          detail: `Desconectado: ${reason}`,
          progress: 0,
          active: account?.active || false
        });
      }
    });
    
    // Evento de mensaje recibido
    client.on('message', async (message) => {
      this.handleIncomingMessage(message, sessionName);
    });
  }
  
  // Manejar mensaje entrante
  async handleIncomingMessage(message, sessionName) {
    try {
      // Ignorar mensajes de estado (como confirmaciones de lectura)
      if (message.isStatus) return;
      
      // Obtener cuenta que recibió el mensaje
      const account = this.getAccountBySession(sessionName);
      if (!account) return;
      
      // Ignorar mensajes si la cuenta no está activa
      if (!account.active) {
        logger.info(`Mensaje ignorado en cuenta inactiva ${account.phoneNumber}`);
        return;
      }
      
      // Verificar si es mensaje de administrador (comandos con !)
      if (this.isAdminMessage(message)) {
        await this.handleAdminCommand(message, account);
        return;
      }
      
      // Procesar mensaje normal
      await this.processRegularMessage(message, account);
      
      // Emitir evento para la interfaz web
      if (this.io) {
        this.io.emit('botChatMessage', {
          from: message.from.includes('@g.us') ? 'Grupo' : message.from.replace('@c.us', ''),
          message: message.body
        });
      }
    } catch (err) {
      logger.error('Error al procesar mensaje entrante:', err);
    }
  }
  
  // Verificar si un mensaje es de un administrador
  isAdminMessage(message) {
    // Lista de números de administradores que pueden controlar el bot
    const adminNumbers = ['5214962541655@c.us']; // Reemplazar con tu número
    return adminNumbers.includes(message.from) && message.body.startsWith('!');
  }
  
  // Procesar comandos de administrador
  async handleAdminCommand(message, account) {
    const cmd = message.body.trim().toLowerCase();
    
    if (cmd.startsWith('!learn ')) {
      // Formato: !learn pregunta | respuesta
      const parts = message.body.substring(7).split('|');
      if (parts.length === 2) {
        const trigger = parts[0].trim().toLowerCase();
        const response = parts[1].trim();
        
        if (trigger && response) {
          this.updateResponse(trigger, response);
          account.client.sendMessage(message.from, `✅ Respuesta aprendida: "${trigger}" -> "${response}"`);
        } else {
          account.client.sendMessage(message.from, '❌ Formato incorrecto. Usa: !learn pregunta | respuesta');
        }
      } else {
        account.client.sendMessage(message.from, '❌ Formato incorrecto. Usa: !learn pregunta | respuesta');
      }
    } 
    else if (cmd.startsWith('!switch ')) {
      // Cambiar cuenta activa
      const targetIndex = parseInt(cmd.substring(8).trim());
      if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < this.accounts.length) {
        this.setActiveAccount(targetIndex);
        account.client.sendMessage(message.from, `✅ Cambiado a cuenta ${this.accounts[targetIndex].phoneNumber}`);
      } else {
        account.client.sendMessage(message.from, `❌ Índice de cuenta inválido. Rango válido: 0-${this.accounts.length - 1}`);
      }
    }
    else if (cmd === '!status') {
      // Mostrar estado de todas las cuentas
      let statusMsg = '*Estado de las cuentas:*\n\n';
      this.accounts.forEach((acc, index) => {
        statusMsg += `${index}: ${acc.phoneNumber} - ${acc.status} ${acc.active ? '(ACTIVA)' : ''}\n`;
      });
      account.client.sendMessage(message.from, statusMsg);
    }
  }
  
  // Procesar mensaje normal de usuario - MÉTODO MEJORADO
  async processRegularMessage(message, account) {
    try {
      const msgText = message.body.trim().toLowerCase();
      let response = null;
      
      // Buscar respuesta en los datos de aprendizaje
      if (this.learningData.responses[msgText]) {
        response = this.learningData.responses[msgText];
        logger.info(`Respuesta encontrada en base de datos para: "${msgText}"`);
      } 
      // Si no hay respuesta predefinida y está configurado OpenAI, usar IA
      else if (global.aiHandler) {
        logger.info(`Intentando generar respuesta con IA para: "${msgText}"`);
        try {
          response = await global.aiHandler.generateResponse(message.body);
          logger.info(`Respuesta de IA generada correctamente para: "${msgText}"`);
        } catch (error) {
          logger.error(`Error al generar respuesta con IA: ${error.message}`);
          response = "Lo siento, no pude procesar tu solicitud en este momento. Un agente te atenderá pronto.";
        }
      } else {
        logger.warn(`No hay manejador de IA configurado para mensajes sin respuesta predefinida`);
        response = "Gracias por tu mensaje. Un agente te atenderá pronto.";
      }
      
      // Siempre enviar una respuesta, incluso si es el mensaje predeterminado
      if (response) {
        await account.client.sendMessage(message.from, response);
        logger.info(`Respuesta enviada a ${message.from}: ${response.substring(0, 50)}...`);
      } else {
        // Última red de seguridad
        const defaultResponse = "Gracias por contactarnos. Tu mensaje ha sido recibido y será atendido pronto.";
        await account.client.sendMessage(message.from, defaultResponse);
        logger.warn(`Respuesta predeterminada enviada a ${message.from} porque no se generó ninguna respuesta`);
      }
    } catch (err) {
      logger.error(`Error al procesar mensaje regular: ${err.message}`);
      try {
        // Intentar enviar mensaje de error en caso de falla completa
        await account.client.sendMessage(message.from, "Lo sentimos, hay un problema temporal con nuestro sistema. Por favor, intenta más tarde.");
      } catch (sendError) {
        logger.error(`Error crítico al enviar mensaje de error: ${sendError.message}`);
      }
    }
  }
  
  // Actualizar/agregar una respuesta aprendida
  updateResponse(trigger, response) {
    try {
      if (!trigger || !response) return false;
      
      this.learningData.responses[trigger.toLowerCase()] = response;
      utils.saveLearningData(this.learningData);
      logger.info(`Respuesta actualizada: "${trigger}" -> "${response.substring(0, 50)}..."`);
      return true;
    } catch (err) {
      logger.error('Error al actualizar respuesta:', err);
      return false;
    }
  }
  
  // Eliminar una respuesta
  deleteResponse(trigger) {
    try {
      if (!trigger) return false;
      
      if (this.learningData.responses[trigger]) {
        delete this.learningData.responses[trigger];
        utils.saveLearningData(this.learningData);
        logger.info(`Respuesta eliminada: "${trigger}"`);
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Error al eliminar respuesta:', err);
      return false;
    }
  }
  
  // Obtener todas las respuestas
  getAllResponses() {
    return this.learningData.responses || {};
  }
  
  // Recargar datos de aprendizaje desde el archivo
  reloadLearningData() {
    try {
      const data = utils.loadLearningData();
      if (data) {
        this.learningData = data;
        logger.info('Datos de aprendizaje recargados correctamente');
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Error al recargar datos de aprendizaje:', err);
      return false;
    }
  }
  
  // Cambiar cuenta activa
  setActiveAccount(index) {
    if (index < 0 || index >= this.accounts.length) {
      logger.error(`Índice de cuenta inválido: ${index}`);
      return false;
    }
    
    // Desactivar cuenta actual
    if (this.accounts[this.activeAccountIndex]) {
      this.accounts[this.activeAccountIndex].active = false;
    }
    
    // Activar nueva cuenta
    this.activeAccountIndex = index;
    this.accounts[index].active = true;
    
    logger.info(`Cuenta activa cambiada a ${this.accounts[index].phoneNumber}`);
    
    // Notificar cambio
    if (this.io) {
      this.emitCurrentStatus();
    }
    
    return true;
  }
  
  // Obtener cuenta por nombre de sesión
  getAccountBySession(sessionName) {
    return this.accounts.find(a => a.sessionName === sessionName);
  }
  
  // Eliminar una cuenta
  async removeAccount(sessionName) {
    const accountIndex = this.accounts.findIndex(
      account => account.sessionName === sessionName
    );
    
    if (accountIndex >= 0) {
      const account = this.accounts[accountIndex];
      
      // Cerrar cliente si existe
      if (account.client) {
        try {
          await account.client.destroy();
        } catch (err) {
          logger.error(`Error al destruir cliente: ${err.message}`);
        }
      }
      
      // Eliminar de la lista
      this.accounts.splice(accountIndex, 1);
      
      // Eliminar directorio de sesión
      const sessionDir = path.join(process.cwd(), '.wwebjs_auth', sessionName);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      
      logger.info(`Cuenta ${sessionName} eliminada correctamente`);
      
      // Si era la cuenta activa, activar otra cuenta
      if (this.accounts.length > 0 && accountIndex === this.activeAccountIndex) {
        this.activeAccountIndex = 0;
        this.accounts[0].active = true;
      }
      
      return true;
    }
    
    return false;
  }
  
  // Regenerar código QR para una cuenta
  async regenerateQR(sessionName) {
    try {
      logger.info(`Iniciando regeneración de QR para ${sessionName}`);
      
      // Notificar al cliente que comenzó el proceso
      if (this.io) {
        this.io.emit('qrRefreshStarted', { sessionName });
      }
      
      const account = this.getAccountBySession(sessionName);
      if (!account) {
        throw new Error(`Cuenta ${sessionName} no encontrada`);
      }
      
      // Cerrar sesión actual si está conectada
      if (account.status === 'ready' || account.status === 'authenticated') {
        await account.client.logout();
      }
      
      // Destruir cliente actual
      if (account.client) {
        await account.client.destroy();
      }
      
      // Eliminar archivos de sesión
      const sessionDir = path.join(process.cwd(), '.wwebjs_auth', sessionName);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      
      // Crear nuevo cliente
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionName }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-software-rasterizer'
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        }
      });
      
      // Actualizar referencia en la cuenta
      account.client = client;
      account.status = 'initializing';
      account.detail = 'Reinicializando cliente';
      
      // Configurar eventos
      this.setupClientEvents(client, account.phoneNumber, sessionName);
      
      // Inicializar cliente
      client.initialize();
      
      return true;
    } catch (err) {
      logger.error(`Error al regenerar QR para ${sessionName}:`, err);
      
      // Notificar error al cliente
      if (this.io) {
        this.io.emit('qrRefreshError', { 
          sessionName, 
          error: err.message 
        });
      }
      
      throw err;
    }
  }
  
  // Emitir estado actual de todas las cuentas
  emitCurrentStatus() {
    if (!this.io) return;
    
    this.accounts.forEach(account => {
      this.io.emit('status', {
        sessionName: account.sessionName,
        phoneNumber: account.phoneNumber,
        status: account.status,
        detail: account.detail || '',
        progress: account.status === 'ready' ? 100 : 
                 account.status === 'authenticated' ? 70 :
                 account.status === 'waiting' ? 40 :
                 account.status === 'initializing' ? 20 : 0,
        active: account.active
      });
    });
    
    // Emitir información del sistema
    this.io.emit('systemInfo', {
      accounts: this.accounts.length,
      connectedAccounts: this.accounts.filter(a => a.status === 'ready' || a.status === 'authenticated').length,
      activeAccount: this.accounts[this.activeAccountIndex]?.phoneNumber || '-'
    });
  }
}

// Función principal
async function main() {
  try {
    // Inicializar gestor de WhatsApp
    const manager = new WhatsAppManager();
    
    // Limpiar sesiones duplicadas
    await manager.cleanupDuplicateSessions();
    
    // Agregar solo una cuenta (reemplaza con tu número real)
    manager.addAccount('4962541655', 'cuenta_principal');
    
    // Emitir estado inicial
    setTimeout(() => {
      manager.emitCurrentStatus();
    }, 2000);
    
    logger.info('WhatsApp Bot iniciado correctamente');
  } catch (err) {
    logger.error('Error al iniciar WhatsApp Bot:', err);
  }
}

// Iniciar la aplicación
main();