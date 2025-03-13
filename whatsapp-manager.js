// Gestión de múltiples cuentas de WhatsApp
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const config = require('./config');

class WhatsAppManager {
  constructor(io) {
    this.accounts = [];
    this.activeAccount = null;
    this.io = io; // Socket.io para enviar QR al cliente
    this.learningDatabase = {
      responses: {},
      mediaHandlers: {}
    };
    
    // Cargar datos de aprendizaje si existen
    this.loadLearningData();
  }
  
  // Cargar datos de aprendizaje previos
  loadLearningData() {
    try {
      const data = fs.readFileSync(config.files.learningData, 'utf8');
      this.learningDatabase = JSON.parse(data);
      console.log('Datos de aprendizaje cargados correctamente');
    } catch (err) {
      console.log('No se encontraron datos de aprendizaje previos, creando nueva base de datos');
      this.learningDatabase = config.initialLearningData;
      this.saveLearningData();
    }
  }
  
  // Guardar datos de aprendizaje
  saveLearningData() {
    fs.writeFileSync(config.files.learningData, JSON.stringify(this.learningDatabase, null, 2));
    console.log('Datos de aprendizaje guardados correctamente');
  }
  
  // Emitir el estado actual de todas las cuentas
  emitCurrentStatus() {
    if (!this.io) return;
    
    this.accounts.forEach(account => {
      let status = 'disconnected';
      
      try {
        if (account.client && account.client.info) {
          status = 'ready';
        } else if (account.client && account.client.authStrategy) {
          // Comprobamos si existe una sesión de autenticación sin llamar al método
          const authStrategy = account.client.authStrategy;
          // La verificación de autenticación depende de la versión de whatsapp-web.js
          // Intentamos métodos alternativos para determinar si está autenticado
          if (authStrategy._authenticated || 
              (typeof authStrategy.isAuthenticated === 'boolean' && authStrategy.isAuthenticated) ||
              fs.existsSync(`${config.paths.sessions}/${account.sessionName}/session`)) {
            status = 'authenticated';
          }
        }
      } catch (error) {
        console.error(`Error al obtener estado de ${account.phoneNumber}:`, error.message);
      }
      
      this.io.emit('status', {
        sessionName: account.sessionName,
        phoneNumber: account.phoneNumber,
        status: status,
        active: account.active
      });
    });
  }
  
  // Agregar una nueva cuenta
  addAccount(phoneNumber, sessionName) {
    const sessionFolder = `${config.paths.sessions}/${sessionName}`;
    
    // Crear cliente de WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionName }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: config.whatsapp.puppeteerArgs
      }
    });
    
    // Configurar eventos
    client.on('qr', (qr) => {
      console.log(`QR Code generado para la cuenta ${phoneNumber}`);
      
      // Convertir QR a imagen y enviarlo al cliente web
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          console.error('Error al generar QR:', err);
          return;
        }
        
        // Emitir el código QR a través de socket.io
        this.io.emit('qr', {
          sessionName,
          phoneNumber,
          qrDataUrl: url
        });
        
        // También guardar el QR como archivo
        qrcode.toFile(`${config.paths.public}/qr-${sessionName}.png`, qr, {
          type: 'png',
          margin: 2,
        }, (err) => {
          if (err) console.error('Error al guardar QR como archivo:', err);
          else console.log(`QR guardado como qr-${sessionName}.png`);
        });
      });
    });
    
    client.on('ready', () => {
      console.log(`Cliente ${phoneNumber} está listo!`);
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'ready',
        active: (this.activeAccount && this.activeAccount.phoneNumber === phoneNumber)
      });
    });
    
    client.on('authenticated', () => {
      console.log(`Cliente ${phoneNumber} autenticado correctamente`);
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'authenticated',
        active: (this.activeAccount && this.activeAccount.phoneNumber === phoneNumber)
      });
    });
    
    client.on('message', async (message) => {
      // Si el mensaje es para administrar el bot (desde un número autorizado)
      if (this.isAdminMessage(message)) {
        this.handleAdminCommand(message, client);
        return;
      }
      
      // Manejar mensajes regulares
      await this.handleIncomingMessage(message, client);
    });
    
    client.on('disconnected', (reason) => {
      console.log(`Cliente ${phoneNumber} desconectado:`, reason);
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'disconnected',
        reason,
        active: (this.activeAccount && this.activeAccount.phoneNumber === phoneNumber)
      });
      
      // Si se desconecta por baneo, cambiamos de cuenta
      if (reason.includes('banned') || reason.includes('timeout')) {
        console.log(`La cuenta ${phoneNumber} parece estar baneada, cambiando a otra cuenta...`);
        this.switchToNextAccount();
      }
      
      // Reiniciar el cliente después de la desconexión
      client.initialize().catch(err => {
        console.error(`Error al reinicializar cliente ${phoneNumber}:`, err);
      });
    });
    
    // Inicializamos el cliente
    client.initialize().catch(err => {
      console.error(`Error al inicializar cliente ${phoneNumber}:`, err);
    });
    
    // Agregamos la cuenta a nuestra lista
    this.accounts.push({
      phoneNumber,
      sessionName,
      client,
      active: false,
      bannedUntil: null
    });
    
    // Si es la primera cuenta, la activamos
    if (this.accounts.length === 1) {
      this.accounts[0].active = true;
      this.activeAccount = this.accounts[0];
    }
    
    // Emitir estado inicial
    this.io.emit('status', {
      sessionName,
      phoneNumber, 
      status: 'initializing',
      active: this.accounts.length === 1
    });
    
    return this.accounts.length - 1; // Devolvemos el índice de la cuenta
  }
  
  // Verificar si un mensaje es de un administrador
  isAdminMessage(message) {
    return config.whatsapp.adminNumbers.includes(message.from) && message.body.startsWith('!');
  }
  
  // Manejar comandos de administración
  async handleAdminCommand(message, client) {
    const command = message.body.split(' ')[0].toLowerCase();
    const params = message.body.split(' ').slice(1).join(' ');
    
    switch (command) {
      case '!switch':
        // Cambiar de cuenta: !switch <índice>
        const accountIndex = parseInt(params);
        if (isNaN(accountIndex) || accountIndex >= this.accounts.length) {
          client.sendMessage(message.from, 'Índice de cuenta inválido');
          return;
        }
        this.switchToAccount(accountIndex);
        client.sendMessage(message.from, `Cambiado a la cuenta ${this.accounts[accountIndex].phoneNumber}`);
        break;
        
      case '!learn':
        // Enseñar al bot: !learn <pregunta> | <respuesta>
        const parts = params.split('|');
        if (parts.length !== 2) {
          client.sendMessage(message.from, 'Formato incorrecto. Usa: !learn pregunta | respuesta');
          return;
        }
        
        const trigger = parts[0].trim().toLowerCase();
        const response = parts[1].trim();
        
        this.learningDatabase.responses[trigger] = response;
        this.saveLearningData();
        
        client.sendMessage(message.from, `Aprendido: "${trigger}" -> "${response}"`);
        break;
        
      case '!status':
        // Ver estado de las cuentas
        let statusMsg = 'Estado de las cuentas:\n';
        this.accounts.forEach((account, index) => {
          statusMsg += `${index}: ${account.phoneNumber} - ${account.active ? 'ACTIVA' : 'inactiva'}`;
          if (account.bannedUntil) {
            statusMsg += ` (baneada hasta ${account.bannedUntil})`;
          }
          statusMsg += '\n';
        });
        client.sendMessage(message.from, statusMsg);
        break;
        
      default:
        client.sendMessage(message.from, 'Comando desconocido. Comandos disponibles: !switch, !learn, !status');
    }
  }
  
  // Manejar mensajes entrantes
  async handleIncomingMessage(message, client) {
    console.log(`Mensaje recibido: ${message.body}`);
    
    // Verificar si es un mensaje de un chat privado o de un grupo
    // Los IDs de chats de grupo en WhatsApp terminan con "@g.us"
    const isGroup = message.from.endsWith('@g.us');
    
    // Si es un mensaje multimedia
    if (message.hasMedia) {
      await this.handleMediaMessage(message, client);
      return;
    }
    
    // Si es un mensaje privado (no de grupo), redirigir al número correcto
    if (!isGroup) {
      client.sendMessage(message.from, config.whatsapp.redirectMessage);
      return;
    }
    
    // Si es un mensaje de grupo, buscar respuesta en la base de datos de aprendizaje
    const messageText = message.body.toLowerCase();
    let response = null;
    
    // Buscar coincidencia exacta
    if (this.learningDatabase.responses[messageText]) {
      response = this.learningDatabase.responses[messageText];
    } else {
      // Buscar coincidencia parcial
      for (const key in this.learningDatabase.responses) {
        if (messageText.includes(key)) {
          response = this.learningDatabase.responses[key];
          break;
        }
      }
    }
    
    // Si encontramos una respuesta, la enviamos
    if (response) {
      client.sendMessage(message.from, response);
    }
  }
  
  // Manejar mensajes multimedia
  async handleMediaMessage(message, client) {
    try {
      const media = await message.downloadMedia();
      
      // Por defecto, simplemente confirmamos la recepción del archivo
      const response = "He recibido tu archivo multimedia. ¿En qué puedo ayudarte?";
      client.sendMessage(message.from, response);
      
      // Aquí se podría implementar un análisis más sofisticado de los archivos
      // Por ejemplo, usando OCR para imágenes, o transcripción para audio
    } catch (error) {
      console.error('Error al manejar mensaje multimedia:', error);
      client.sendMessage(message.from, "Lo siento, no pude procesar ese archivo multimedia.");
    }
  }
  
  // Cambiar a una cuenta específica
  switchToAccount(index) {
    if (index < 0 || index >= this.accounts.length) {
      console.error('Índice de cuenta inválido');
      return false;
    }
    
    // Desactivar la cuenta actual
    if (this.activeAccount) {
      this.activeAccount.active = false;
      
      // Emitir estado actualizado para la cuenta que deja de ser activa
      try {
        let status = 'disconnected';
        if (this.activeAccount.client && this.activeAccount.client.info) {
          status = 'ready';
        }
        
        this.io.emit('status', {
          sessionName: this.activeAccount.sessionName,
          phoneNumber: this.activeAccount.phoneNumber,
          status: status,
          active: false
        });
      } catch (error) {
        console.error('Error al emitir estado de cuenta desactivada:', error.message);
      }
    }
    
    // Activar la nueva cuenta
    this.accounts[index].active = true;
    this.activeAccount = this.accounts[index];
    
    // Emitir estado actualizado para la nueva cuenta activa
    try {
      let status = 'disconnected';
      if (this.activeAccount.client && this.activeAccount.client.info) {
        status = 'ready';
      }
      
      this.io.emit('status', {
        sessionName: this.activeAccount.sessionName,
        phoneNumber: this.activeAccount.phoneNumber,
        status: status,
        active: true
      });
    } catch (error) {
      console.error('Error al emitir estado de cuenta activada:', error.message);
    }
    
    console.log(`Cambiado a la cuenta ${this.activeAccount.phoneNumber}`);
    return true;
  }
  
  // Cambiar automáticamente a la siguiente cuenta disponible
  switchToNextAccount() {
    const currentIndex = this.accounts.findIndex(account => account === this.activeAccount);
    
    // Buscar la siguiente cuenta no baneada
    for (let i = 1; i <= this.accounts.length; i++) {
      const nextIndex = (currentIndex + i) % this.accounts.length;
      const nextAccount = this.accounts[nextIndex];
      
      if (!nextAccount.bannedUntil || new Date() > new Date(nextAccount.bannedUntil)) {
        return this.switchToAccount(nextIndex);
      }
    }
    
    console.error('No hay cuentas disponibles sin baneo');
    return false;
  }
}

module.exports = WhatsAppManager;