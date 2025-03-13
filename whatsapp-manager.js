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
    this.pendingResponses = {}; // Para almacenar mensajes pendientes de respuesta
    
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
  
  // Función para calcular la distancia de Levenshtein (cuánto se parecen dos palabras)
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Incrementar a lo largo de la primera columna de cada fila
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // Incrementar a lo largo de la primera fila de cada columna
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Rellenar el resto de la matriz
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // sustitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Función para encontrar la palabra clave más similar
  findMostSimilarKey(text, threshold = 0.7) {
    let bestMatch = null;
    let bestScore = 0;
    
    // Dividir el texto del mensaje en palabras
    const words = text.toLowerCase().split(/\s+/);
    
    for (const key in this.learningDatabase.responses) {
      // Para cada palabra clave en nuestra base de datos
      const keyWords = key.toLowerCase().split(/\s+/);
      
      for (const keyWord of keyWords) {
        if (keyWord.length < 4) continue; // Ignorar palabras muy cortas
        
        for (const word of words) {
          if (word.length < 4) continue; // Ignorar palabras muy cortas
          
          // Calcular la similitud como 1 - (distancia / longitud máxima)
          const maxLength = Math.max(keyWord.length, word.length);
          const distance = this.levenshteinDistance(keyWord, word);
          const similarity = 1 - (distance / maxLength);
          
          if (similarity > threshold && similarity > bestScore) {
            bestMatch = key;
            bestScore = similarity;
          }
        }
      }
    }
    
    return bestMatch;
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
    
    // Para el comando !responder, necesitamos manejar el formato diferente
    if (command === '!responder') {
      // Formato: !responder messageId | respuesta
      const fullParams = message.body.substring(command.length).trim();
      const separatorIndex = fullParams.indexOf('|');
      
      if (separatorIndex === -1) {
        client.sendMessage(message.from, 'Formato incorrecto. Usa: !responder messageId | respuesta');
        return;
      }
      
      const messageId = fullParams.substring(0, separatorIndex).trim();
      const response = fullParams.substring(separatorIndex + 1).trim();
      
      // Verificar si tenemos este mensaje pendiente
      if (!this.pendingResponses || !this.pendingResponses[messageId]) {
        client.sendMessage(message.from, 'No se encontró el mensaje pendiente o ya expiró.');
        return;
      }
      
      try {
        // Enviar la respuesta al chat original
        const pendingMessage = this.pendingResponses[messageId];
        await client.sendMessage(pendingMessage.chatId, response);
        
        // Confirmar al administrador
        client.sendMessage(message.from, `✅ Respuesta enviada a ${pendingMessage.contact}`);
        
        // Opcional: Guardar esta respuesta en la base de aprendizaje
        const originalMessage = pendingMessage.message.toLowerCase();
        this.learningDatabase.responses[originalMessage] = response;
        this.saveLearningData();
        
        // Eliminar el mensaje de pendientes
        delete this.pendingResponses[messageId];
        
        // Informar que se ha guardado en la base de conocimientos
        client.sendMessage(message.from, `📝 La respuesta también se ha guardado en la base de conocimientos.`);
      } catch (error) {
        console.error('Error al enviar respuesta:', error);
        client.sendMessage(message.from, `❌ Error al enviar respuesta: ${error.message}`);
      }
      
      return;
    }
    
    // Para los demás comandos, usamos el código original
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
        const learnResponse = parts[1].trim();
        
        this.learningDatabase.responses[trigger] = learnResponse;
        this.saveLearningData();
        
        client.sendMessage(message.from, `Aprendido: "${trigger}" -> "${learnResponse}"`);
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
        
        // Añadir información sobre mensajes pendientes
        if (this.pendingResponses && Object.keys(this.pendingResponses).length > 0) {
          statusMsg += '\nMensajes pendientes de respuesta: ' + Object.keys(this.pendingResponses).length;
        }
        
        client.sendMessage(message.from, statusMsg);
        break;
      
      case '!pendientes':
        // Mostrar lista de mensajes pendientes
        if (!this.pendingResponses || Object.keys(this.pendingResponses).length === 0) {
          client.sendMessage(message.from, 'No hay mensajes pendientes de respuesta.');
          return;
        }
        
        let pendingMsg = '📋 *Mensajes pendientes de respuesta:*\n\n';
        
        Object.entries(this.pendingResponses).forEach(([id, data], index) => {
          const time = data.timestamp.toLocaleString();
          pendingMsg += `*${index + 1}.* ID: ${id}\n`;
          pendingMsg += `   De: ${data.contact}\n`;
          pendingMsg += `   Mensaje: ${data.message}\n`;
          pendingMsg += `   Recibido: ${time}\n\n`;
        });
        
        pendingMsg += 'Para responder usa: !responder [ID] | [respuesta]';
        
        client.sendMessage(message.from, pendingMsg);
        break;
        
      default:
        client.sendMessage(message.from, 'Comando desconocido. Comandos disponibles: !switch, !learn, !status, !pendientes, !responder');
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
      let foundPartialMatch = false;
      for (const key in this.learningDatabase.responses) {
        if (messageText.includes(key)) {
          response = this.learningDatabase.responses[key];
          foundPartialMatch = true;
          break;
        }
      }
      
      // Si no se encontró coincidencia parcial, buscar similar con Levenshtein
      if (!foundPartialMatch) {
        const mostSimilarKey = this.findMostSimilarKey(messageText);
        if (mostSimilarKey) {
          response = this.learningDatabase.responses[mostSimilarKey];
          // Registrar en el log cuando se usa una coincidencia similar
          console.log(`Coincidencia similar encontrada: "${messageText}" -> "${mostSimilarKey}"`);
        }
      }
    }
    
    // Si encontramos una respuesta, la enviamos
    if (response) {
      client.sendMessage(message.from, response);
    } else {
      // Si no tenemos una respuesta, reenviar al administrador
      try {
        // Guardamos temporalmente el chat que requiere respuesta para poder responder después
        // Formato: { chatId: string, message: string, timestamp: Date }
        if (!this.pendingResponses) {
          this.pendingResponses = {};
        }
        
        const timestamp = new Date();
        const messageId = `${message.from}_${timestamp.getTime()}`;
        
        this.pendingResponses[messageId] = {
          chatId: message.from,
          message: message.body,
          timestamp: timestamp,
          contact: message._data.notifyName || "Usuario" // Nombre del contacto si está disponible
        };
        
        // Reenviar al administrador (podemos enviar a todos los administradores configurados)
        for (const adminNumber of config.whatsapp.adminNumbers) {
          // Agregamos un ID único para poder identificar a qué mensaje responde el admin
          await client.sendMessage(adminNumber, 
            `⚠️ *MENSAJE SIN RESPUESTA* ⚠️\n\n` +
            `*De:* ${this.pendingResponses[messageId].contact} (${message.from})\n` +
            `*Grupo:* ${isGroup ? 'Sí' : 'No'}\n` +
            `*Mensaje:* ${message.body}\n\n` +
            `Para responder, escribe:\n` +
            `!responder ${messageId} | Tu respuesta aquí`
          );
        }
        
        // Opcional: Enviar un mensaje al usuario indicando que su mensaje está siendo procesado
        // client.sendMessage(message.from, "Estamos procesando tu consulta, en breve te responderemos.");
        
        // Limpiar mensajes pendientes antiguos (más de 24 horas)
        this.cleanOldPendingResponses();
      } catch (error) {
        console.error('Error al reenviar mensaje al administrador:', error);
      }
    }
  }
  
  // Nueva función para limpiar mensajes pendientes antiguos
  cleanOldPendingResponses() {
    if (!this.pendingResponses) return;
    
    const now = new Date();
    const oldResponseIds = [];
    
    // Identificar mensajes antiguos (más de 24 horas)
    for (const [id, data] of Object.entries(this.pendingResponses)) {
      const ageInHours = (now - data.timestamp) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        oldResponseIds.push(id);
      }
    }
    
    // Eliminar mensajes antiguos
    oldResponseIds.forEach(id => {
      delete this.pendingResponses[id];
    });
    
    if (oldResponseIds.length > 0) {
      console.log(`Se eliminaron ${oldResponseIds.length} mensajes pendientes antiguos`);
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