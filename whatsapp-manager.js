// Gestión de múltiples cuentas de WhatsApp
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const utils = require('./utils');

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
      const filePath = config.paths.learningData || config.files.learningData;
      utils.log(`Intentando cargar datos de aprendizaje desde: ${filePath}`, 'info');
      
      if (!fs.existsSync(filePath)) {
        utils.log(`Archivo ${filePath} no encontrado, creando base de datos inicial`, 'warning');
        this.learningDatabase = config.initialLearningData;
        this.saveLearningData();
        return;
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      utils.log(`Contenido del archivo leído: ${data.substring(0, 100)}...`, 'info');
      
      if (!data || data.trim() === '') {
        utils.log('Archivo vacío, inicializando con datos por defecto', 'warning');
        this.learningDatabase = config.initialLearningData;
        this.saveLearningData();
        return;
      }
      
      try {
        this.learningDatabase = JSON.parse(data);
        utils.log(`Datos de aprendizaje cargados correctamente con ${Object.keys(this.learningDatabase.responses || {}).length} respuestas`, 'success');
        
        // Verificar que tenga la estructura correcta
        if (!this.learningDatabase.responses) {
          utils.log('La estructura de datos no contiene "responses", inicializando', 'warning');
          this.learningDatabase.responses = config.initialLearningData.responses;
        }
        
        if (!this.learningDatabase.mediaHandlers) {
          utils.log('La estructura de datos no contiene "mediaHandlers", inicializando', 'warning');
          this.learningDatabase.mediaHandlers = config.initialLearningData.mediaHandlers;
        }
      } catch (parseError) {
        utils.log(`Error al analizar JSON: ${parseError.message}`, 'error');
        utils.log('Inicializando con datos por defecto debido al error de análisis', 'warning');
        this.learningDatabase = config.initialLearningData;
        this.saveLearningData();
      }
    } catch (err) {
      utils.log(`Error al cargar datos de aprendizaje: ${err.message}`, 'error');
      utils.log('Inicializando con datos por defecto debido al error de lectura', 'warning');
      this.learningDatabase = config.initialLearningData;
      this.saveLearningData();
    }
  }
  
  /**
   * Actualiza o agrega una nueva respuesta
   * @param {string} trigger - Palabra clave para activar la respuesta
   * @param {string} response - Respuesta a enviar
   * @returns {boolean} - true si se agregó correctamente
   */
  updateResponse(trigger, response) {
    try {
      const normalizedTrigger = trigger.toLowerCase().trim();
      utils.log(`Actualizando respuesta para "${normalizedTrigger}"`, 'info');
      
      this.learningDatabase.responses[normalizedTrigger] = response;
      const result = this.saveLearningData();
      
      if (result) {
        utils.log(`Respuesta actualizada: "${normalizedTrigger}" -> "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`, 'success');
      }
      
      return result;
    } catch (error) {
      utils.log(`Error al actualizar respuesta: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Elimina una respuesta existente
   * @param {string} trigger - Palabra clave a eliminar
   * @returns {boolean} - true si se eliminó correctamente
   */
  deleteResponse(trigger) {
    try {
      const normalizedTrigger = trigger.toLowerCase().trim();
      utils.log(`Intentando eliminar respuesta para "${normalizedTrigger}"`, 'info');
      
      if (this.learningDatabase.responses[normalizedTrigger]) {
        delete this.learningDatabase.responses[normalizedTrigger];
        const result = this.saveLearningData();
        
        if (result) {
          utils.log(`Respuesta eliminada: "${normalizedTrigger}"`, 'success');
        }
        
        return result;
      } else {
        utils.log(`No se encontró la respuesta "${normalizedTrigger}" para eliminar`, 'warning');
        return false;
      }
    } catch (error) {
      utils.log(`Error al eliminar respuesta: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Obtiene todas las respuestas configuradas
   * @returns {Object} - Objeto con todas las respuestas
   */
  getAllResponses() {
    return { ...this.learningDatabase.responses };
  }

  /**
   * Recarga los datos de aprendizaje desde el archivo
   * @returns {boolean} - true si se recargaron correctamente
   */
  reloadLearningData() {
    try {
      utils.log('Recargando datos de aprendizaje...', 'info');
      this.loadLearningData();
      return true;
    } catch (error) {
      utils.log(`Error al recargar datos de aprendizaje: ${error.message}`, 'error');
      return false;
    }
  }
  
  // Guardar datos de aprendizaje
  saveLearningData() {
    try {
      const filePath = config.paths.learningData || config.files.learningData;
      utils.log(`Guardando datos de aprendizaje en: ${filePath}`, 'info');
      
      // Asegurar que el directorio existe
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const jsonData = JSON.stringify(this.learningDatabase, null, 2);
      fs.writeFileSync(filePath, jsonData);
      utils.log(`Datos de aprendizaje guardados correctamente (${jsonData.length} bytes)`, 'success');
      return true;
    } catch (error) {
      utils.log(`Error al guardar datos de aprendizaje: ${error.message}`, 'error');
      return false;
    }
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
        utils.log(`Error al obtener estado de ${account.phoneNumber}: ${error.message}`, 'error');
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
      utils.log(`QR Code generado para la cuenta ${phoneNumber}`, 'info');
      
      // Convertir QR a imagen y enviarlo al cliente web
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          utils.log(`Error al generar QR: ${err.message}`, 'error');
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
          if (err) utils.log(`Error al guardar QR como archivo: ${err.message}`, 'error');
          else utils.log(`QR guardado como qr-${sessionName}.png`, 'success');
        });
      });
    });
    
    client.on('ready', () => {
      utils.log(`Cliente ${phoneNumber} está listo!`, 'success');
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'ready',
        active: (this.activeAccount && this.activeAccount.phoneNumber === phoneNumber)
      });
    });
    
    client.on('authenticated', () => {
      utils.log(`Cliente ${phoneNumber} autenticado correctamente`, 'success');
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
      utils.log(`Cliente ${phoneNumber} desconectado: ${reason}`, 'warning');
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'disconnected',
        reason,
        active: (this.activeAccount && this.activeAccount.phoneNumber === phoneNumber)
      });
      
      // Si se desconecta por baneo, cambiamos de cuenta
      if (reason.includes('banned') || reason.includes('timeout')) {
        utils.log(`La cuenta ${phoneNumber} parece estar baneada, cambiando a otra cuenta...`, 'warning');
        this.switchToNextAccount();
      }
      
      // Reiniciar el cliente después de la desconexión
      setTimeout(() => {
        utils.log(`Intentando reconectar cliente ${phoneNumber}...`, 'info');
        client.initialize().catch(err => {
          utils.log(`Error al reinicializar cliente ${phoneNumber}: ${err.message}`, 'error');
        });
      }, 10000); // Esperar 10 segundos antes de intentar reconectar
    });
    
    // Inicializamos el cliente
    client.initialize().catch(err => {
      utils.log(`Error al inicializar cliente ${phoneNumber}: ${err.message}`, 'error');
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
  
  // Cerrar sesión de WhatsApp y eliminar archivos de sesión
  async logoutAccount(sessionName) {
    try {
      const accountIndex = this.accounts.findIndex(acc => acc.sessionName === sessionName);
      if (accountIndex < 0) {
        throw new Error(`Cuenta no encontrada: ${sessionName}`);
      }
      
      const account = this.accounts[accountIndex];
      
      // Cerrar sesión de WhatsApp
      if (account.client) {
        await account.client.logout();
        utils.log(`Sesión cerrada para ${account.phoneNumber}`, 'success');
        
        // Si era la cuenta activa, cambiar a otra
        if (this.activeAccount === account) {
          this.switchToNextAccount();
        }
        
        // Actualizar estado
        this.io.emit('status', {
          sessionName: account.sessionName,
          phoneNumber: account.phoneNumber,
          status: 'disconnected',
          active: false,
          reason: 'logged-out'
        });
        
        return true;
      } else {
        throw new Error('Cliente no inicializado');
      }
    } catch (error) {
      utils.log(`Error en logoutAccount: ${error.message}`, 'error');
      throw error;
    }
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
        this.updateResponse(originalMessage, response);
        
        // Eliminar el mensaje de pendientes
        delete this.pendingResponses[messageId];
        
        // Informar que se ha guardado en la base de conocimientos
        client.sendMessage(message.from, `📝 La respuesta también se ha guardado en la base de conocimientos.`);
      } catch (error) {
        utils.log(`Error al enviar respuesta: ${error.message}`, 'error');
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
        
        const success = this.updateResponse(trigger, learnResponse);
        
        if (success) {
          client.sendMessage(message.from, `Aprendido: "${trigger}" -> "${learnResponse}"`);
        } else {
          client.sendMessage(message.from, `❌ Error al guardar la respuesta. Por favor, inténtalo de nuevo.`);
        }
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
        
        // Añadir información sobre respuestas
        statusMsg += `\n\nRespuestas configuradas: ${Object.keys(this.learningDatabase.responses || {}).length}`;
        
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
        
      case '!reload':
        // Recargar datos de aprendizaje
        const reloadSuccess = this.reloadLearningData();
        if (reloadSuccess) {
          client.sendMessage(message.from, `✅ Datos de aprendizaje recargados correctamente. Respuestas disponibles: ${Object.keys(this.learningDatabase.responses || {}).length}`);
        } else {
          client.sendMessage(message.from, `❌ Error al recargar datos de aprendizaje.`);
        }
        break;
        
      default:
        client.sendMessage(message.from, 'Comando desconocido. Comandos disponibles: !switch, !learn, !status, !pendientes, !responder, !reload');
    }
  }
  
  // Manejar mensajes entrantes
  async handleIncomingMessage(message, client) {
    utils.log(`Mensaje recibido: "${message.body}" de ${message.from}`, 'info');
    
    // Verificar si es un mensaje de un chat privado o de un grupo
    const isGroup = message.from.endsWith('@g.us');
    utils.log(`Es mensaje de grupo: ${isGroup}`, 'info');
    
    // Si es un mensaje multimedia, se delega a handleMediaMessage
    if (message.hasMedia) {
      await this.handleMediaMessage(message, client);
      return;
    }
    
    // Solo redirigir mensajes privados si no es grupo
    if (!isGroup) {
      utils.log('Enviando mensaje de redirección (chat privado)', 'info');
      await client.sendMessage(message.from, config.whatsapp.redirectMessage);
      return;
    }
    
    // Procesar mensaje de grupo
    utils.log('Procesando mensaje de grupo...', 'info');
    
    // Verificar que tenemos respuestas cargadas
    if (!this.learningDatabase || !this.learningDatabase.responses) {
      utils.log('Base de datos de respuestas no inicializada o vacía. Recargando...', 'warning');
      this.loadLearningData();
      
      // Si aún no hay respuestas, usar respuestas por defecto
      if (!this.learningDatabase || !this.learningDatabase.responses) {
        utils.log('No se pudieron cargar respuestas. Usando respuestas por defecto', 'warning');
        this.learningDatabase = JSON.parse(JSON.stringify(config.initialLearningData));
      }
    }
    
    // Imprimir todas las claves disponibles para depuración
    const availableKeys = Object.keys(this.learningDatabase.responses || {});
    utils.log(`Respuestas disponibles (${availableKeys.length}): ${availableKeys.slice(0, 5).join(', ')}${availableKeys.length > 5 ? '...' : ''}`, 'debug');
    
    const messageText = message.body.toLowerCase().trim();
    utils.log(`Buscando respuesta para: "${messageText}"`, 'info');
    
    let response = null;
    let matchType = '';
    
    // Buscar coincidencia exacta
    if (this.learningDatabase.responses[messageText]) {
      utils.log(`Coincidencia exacta encontrada para: "${messageText}"`, 'success');
      response = this.learningDatabase.responses[messageText];
      matchType = 'exacta';
    } else {
      // Buscar coincidencia parcial
      let foundPartialMatch = false;
      for (const key in this.learningDatabase.responses) {
        if (messageText.includes(key)) {
          utils.log(`Coincidencia parcial encontrada: "${messageText}" incluye "${key}"`, 'success');
          response = this.learningDatabase.responses[key];
          matchType = 'parcial';
          foundPartialMatch = true;
          break;
        }
      }
      
      // Si no se encontró coincidencia parcial, buscar similar con Levenshtein
      if (!foundPartialMatch) {
        utils.log('Buscando coincidencia por similitud...', 'info');
        const mostSimilarKey = this.findMostSimilarKey(messageText);
        if (mostSimilarKey) {
          utils.log(`Coincidencia similar encontrada: "${messageText}" -> "${mostSimilarKey}"`, 'success');
          response = this.learningDatabase.responses[mostSimilarKey];
          matchType = 'similar';
        }
      }
    }
    
    // Si encontramos una respuesta, la enviamos
    if (response) {
      utils.log(`Enviando respuesta (coincidencia ${matchType}): "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`, 'info');
      try {
        // Asegurarse de que el cliente esté activo y usar la cuenta activa
        const clientToUse = this.activeAccount ? this.activeAccount.client : client;
        await clientToUse.sendMessage(message.from, response);
        utils.log('Respuesta enviada exitosamente', 'success');
      } catch (error) {
        utils.log(`Error al enviar respuesta: ${error.message}`, 'error');
        // Intentar con la cuenta original si falló con la activa
        if (client !== this.activeAccount?.client) {
          try {
            utils.log('Intentando enviar con el cliente original...', 'info');
            await client.sendMessage(message.from, response);
            utils.log('Respuesta enviada con cliente original', 'success');
          } catch (secondError) {
            utils.log(`Error al enviar con cliente original: ${secondError.message}`, 'error');
            this.forwardToAdmin(message, client, isGroup, 'Error al enviar respuesta');
          }
        } else {
          this.forwardToAdmin(message, client, isGroup, 'Error al enviar respuesta');
        }
      }
    } else {
      // Si no tenemos una respuesta, reenviar al administrador
      utils.log('No se encontró respuesta, reenviando al administrador', 'info');
      this.forwardToAdmin(message, client, isGroup);
    }
  }
  
  // Manejar mensajes multimedia
  async handleMediaMessage(message, client) {
    try {
      await client.sendMessage(
        message.from,
        'Estimado/a, agradezco su interés en obtener más información. Por favor, siéntase en la libertad de comunicarse con nosotros al número 4961260597 para que podamos brindarle la información que necesita de manera oportuna y precisa. Quedamos a su disposición para cualquier consulta adicional que pueda surgir. ¡Esperamos poder asistirle pronto!'
      );
    } catch (error) {
      utils.log(`Error al manejar mensaje multimedia: ${error.message}`, 'error');
      await client.sendMessage(message.from, "Lo siento, ocurrió un problema al procesar tu archivo multimedia.");
    }
  }
  
  // Reenviar mensaje al administrador
  async forwardToAdmin(message, client, isGroup, errorInfo = '') {
    try {
      // Guardamos temporalmente el chat que requiere respuesta
      if (!this.pendingResponses) {
        this.pendingResponses = {};
      }
      
      const timestamp = new Date();
      const messageId = `${message.from}_${timestamp.getTime()}`;
      
      this.pendingResponses[messageId] = {
        chatId: message.from,
        message: message.body,
        timestamp: timestamp,
        contact: message._data.notifyName || message.author || "Usuario"
      };
      
      // Reenviar a todos los administradores configurados
      for (const adminNumber of config.whatsapp.adminNumbers) {
        utils.log(`Reenviando mensaje a administrador ${adminNumber}`, 'info');
        
        let adminMsg = `⚠️ *MENSAJE SIN RESPUESTA* ⚠️\n\n`;
        
        if (errorInfo) {
          adminMsg += `*ADVERTENCIA*: ${errorInfo}\n\n`;
        }
        
        adminMsg += `*De:* ${this.pendingResponses[messageId].contact}\n` +
                  `*Chat:* ${message.from}\n` +
                  `*Grupo:* ${isGroup ? 'Sí' : 'No'}\n` +
                  `*Mensaje:* ${message.body}\n\n`;
                  
        // Información de depuración
        adminMsg += `*DEBUG*: Respuestas disponibles: ${Object.keys(this.learningDatabase.responses || {}).length}\n\n`;
        
        adminMsg += `Para responder, escribe:\n` +
                  `!responder ${messageId} | Tu respuesta aquí`;
        
        await client.sendMessage(adminNumber, adminMsg);
      }
      
      // Limpiar mensajes pendientes antiguos
      this.cleanOldPendingResponses();
    } catch (error) {
      utils.log(`Error al reenviar mensaje al administrador: ${error.message}`, 'error');
    }
  }
  
  // Limpiar mensajes pendientes antiguos
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
      utils.log(`Se eliminaron ${oldResponseIds.length} mensajes pendientes antiguos`, 'info');
    }
  }
  
  // Cambiar a una cuenta específica
  switchToAccount(index) {
    if (index < 0 || index >= this.accounts.length) {
      utils.log('Índice de cuenta inválido', 'error');
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
        utils.log(`Error al emitir estado de cuenta desactivada: ${error.message}`, 'error');
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
      utils.log(`Error al emitir estado de cuenta activada: ${error.message}`, 'error');
    }
    
    utils.log(`Cambiado a la cuenta ${this.activeAccount.phoneNumber}`, 'success');
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
    
    utils.log('No hay cuentas disponibles sin baneo', 'error');
    return false;
  }
}

module.exports = WhatsAppManager;
