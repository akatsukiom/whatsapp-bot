// whatsapp-manager.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const utils = require('./utils');
const aiHandler = require('./ai-handler');

class WhatsAppManager {
  constructor(io) {
    this.accounts = [];
    this.activeAccount = null;
    this.io = io; // Socket.io para enviar eventos en tiempo real
    this.learningDatabase = {
      responses: {},
      mediaHandlers: {}
    };
    this.pendingResponses = {}; // Para almacenar mensajes pendientes de respuesta
    this.isGeneratingQR = false;

    // Cargar datos de aprendizaje
    this.loadLearningData();
    
    // Iniciar emisión periódica de estado
    if (this.io) {
      this.heartbeatInterval = setInterval(() => {
        this.emitCurrentStatus();
      }, 5000); // Emitir estado cada 5 segundos
    }
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
        utils.log(
          `Datos de aprendizaje cargados correctamente con ${
            Object.keys(this.learningDatabase.responses || {}).length
          } respuestas`,
          'success'
        );

        // Verificar estructura
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

  // Métodos para actualizar, eliminar y obtener respuestas
  updateResponse(trigger, response) {
    try {
      const normalizedTrigger = trigger.toLowerCase().trim();
      utils.log(`Actualizando respuesta para "${normalizedTrigger}"`, 'info');

      this.learningDatabase.responses[normalizedTrigger] = response;
      const result = this.saveLearningData();

      if (result) {
        utils.log(
          `Respuesta actualizada: "${normalizedTrigger}" -> "${response.substring(0, 50)}${
            response.length > 50 ? '...' : ''
          }"`,
          'success'
        );
      }
      return result;
    } catch (error) {
      utils.log(`Error al actualizar respuesta: ${error.message}`, 'error');
      return false;
    }
  }

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

  getAllResponses() {
    return { ...this.learningDatabase.responses };
  }

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

  // Distancia de Levenshtein y búsqueda de similitud
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // sustitución
            matrix[i][j - 1] + 1, // inserción
            matrix[i - 1][j] + 1 // eliminación
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  findMostSimilarKey(text, threshold = 0.7) {
    let bestMatch = null;
    let bestScore = 0;

    const words = text.toLowerCase().split(/\s+/);

    for (const key in this.learningDatabase.responses) {
      const keyWords = key.toLowerCase().split(/\s+/);
      for (const keyWord of keyWords) {
        if (keyWord.length < 4) continue;
        for (const word of words) {
          if (word.length < 4) continue;

          const maxLength = Math.max(keyWord.length, word.length);
          const distance = this.levenshteinDistance(keyWord, word);
          const similarity = 1 - distance / maxLength;

          if (similarity > threshold && similarity > bestScore) {
            bestMatch = key;
            bestScore = similarity;
          }
        }
      }
    }

    return bestMatch;
  }

  // Emitir estado de las cuentas
  emitCurrentStatus() {
    if (!this.io) return;
    
    try {
      // Emitir latido para verificar que los clientes están conectados
      this.io.emit('heartbeat', { timestamp: Date.now() });
      
      // Enviar el estado de la cuenta principal (solo una)
      if (this.accounts.length > 0) {
        const account = this.accounts[0];
        let status = 'disconnected';
        let detail = '';
        let progress = 0;
        
        try {
          if (account.client && account.client.info) {
            status = 'ready';
            progress = 100;
            detail = '¡Conectado exitosamente!';
          } else if (account.client && account.client.authStrategy) {
            const authStrategy = account.client.authStrategy;
            if (
              authStrategy._authenticated ||
              (typeof authStrategy.isAuthenticated === 'boolean' && authStrategy.isAuthenticated) ||
              fs.existsSync(`${config.paths.sessions}/${account.sessionName}/session`)
            ) {
              status = 'authenticated';
              progress = 90;
              detail = 'Autenticado, finalizando conexión...';
            }
          }
          
          // Agregar información adicional
          if (account.lastError) {
            detail = account.lastError.substring(0, 100);
            progress = 0;
          }
          
          if (this.isGeneratingQR) {
            status = 'waiting';
            detail = 'Esperando escaneo del código QR...';
            progress = 70;
          }
        } catch (error) {
          utils.log(`Error al obtener estado de ${account.phoneNumber}: ${error.message}`, 'error');
          status = 'error';
          detail = error.message;
          progress = 0;
        }
        
        this.io.emit('status', {
          sessionName: account.sessionName,
          phoneNumber: account.phoneNumber,
          status: status,
          detail: detail,
          progress: progress,
          active: true,
          timestamp: Date.now()
        });
      }
      
      // Emitir información del sistema
      this.io.emit('systemInfo', {
        accounts: this.accounts.length,
        activeAccount: this.activeAccount ? this.activeAccount.phoneNumber : 'Ninguna',
        pendingMessages: Object.keys(this.pendingResponses || {}).length,
        responses: Object.keys(this.learningDatabase.responses || {}).length,
        timestamp: Date.now()
      });
    } catch (error) {
      utils.log(`Error al emitir estado: ${error.message}`, 'error');
    }
  }

  // Agregar una nueva cuenta (solo una)
  addAccount(phoneNumber, sessionName) {
    const sessionFolder = path.join(config.paths.sessions, sessionName);

    // Emitir estado de inicialización con barra de progreso
    this.io.emit('status', {
      sessionName,
      phoneNumber,
      status: 'initializing',
      detail: 'Inicializando cliente de WhatsApp...',
      progress: 10,
      active: true
    });

    // Crear cliente de WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionName,
        dataPath: sessionFolder
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: config.whatsapp.puppeteerArgs
      }
    });

    // Aumentar el límite de event listeners para evitar warnings
    if (client.maxListeners) {
      client.setMaxListeners(20);
    }

    // Actualizar el progreso mientras se inicializa
    this.io.emit('status', {
      sessionName,
      phoneNumber,
      status: 'initializing',
      detail: 'Preparando navegador...',
      progress: 30,
      active: true
    });

    // Eventos
    client.on('qr', (qr) => {
      utils.log(`QR Code generado para la cuenta ${phoneNumber}`, 'info');
      this.isGeneratingQR = true;
      
      // Emitir estado de espera de escaneo
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'waiting',
        detail: 'Esperando escaneo del código QR...',
        progress: 70,
        active: true
      });
      
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          utils.log(`Error al generar QR: ${err.message}`, 'error');
          return;
        }
        // Emitir QR al panel
        this.io.emit('qr', {
          sessionName,
          phoneNumber,
          qrDataUrl: url
        });
        
        // Guardar QR como archivo
        qrcode.toFile(`${config.paths.public}/qr-${sessionName}.png`, qr, {
          type: 'png',
          margin: 2,
        }, (err) => {
          if (err) utils.log(`Error al guardar QR: ${err.message}`, 'error');
          else utils.log(`QR guardado como qr-${sessionName}.png`, 'success');
        });
      });
    });

    client.on('ready', () => {
      utils.log(`Cliente ${phoneNumber} está listo!`, 'success');
      this.isGeneratingQR = false;
      
      // Actualizar estado de la cuenta
      const accountObj = this.accounts.find(acc => acc.phoneNumber === phoneNumber);
      if (accountObj) {
        accountObj.status = 'ready';
        accountObj.lastError = null;
        accountObj.retryCount = 0;
      }
      
      // Actualizar estado con progreso completo
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'ready',
        detail: '¡Conectado exitosamente!',
        progress: 100,
        active: true
      });
      
      // Enviar mensaje especial al log
      this.io.emit('consoleLog', `✅ CONECTADO EXITOSAMENTE: ${phoneNumber}`);
      
      // Limpiar archivo QR si existe
      const qrFilePath = `${config.paths.public}/qr-${sessionName}.png`;
      if (fs.existsSync(qrFilePath)) {
        try {
          fs.unlinkSync(qrFilePath);
        } catch (error) {
          utils.log(`Error al eliminar archivo QR: ${error.message}`, 'warning');
        }
      }
    });

    client.on('authenticated', () => {
      utils.log(`Cliente ${phoneNumber} autenticado correctamente`, 'success');
      
      // Actualizar estado de la cuenta
      const accountObj = this.accounts.find(acc => acc.phoneNumber === phoneNumber);
      if (accountObj) {
        accountObj.status = 'authenticated';
      }
      
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'authenticated',
        detail: 'Autenticado, finalizando conexión...',
        progress: 90,
        active: true
      });
    });

    client.on('message', async (message) => {
      if (this.isAdminMessage(message)) {
        this.handleAdminCommand(message, client);
        return;
      }
      await this.handleIncomingMessage(message, client);
    });

    // En el evento 'disconnected'
    client.on('disconnected', (reason) => {
      // Verificar si la desconexión es por cierre de sesión explícito
      const isIntentionalLogout = reason.includes('logout') || reason.includes('user request');
      utils.log(`Cliente ${phoneNumber} desconectado: ${reason}`, 'warning');
      this.isGeneratingQR = false;
      
      // Guardar el mensaje de error para mostrar en la interfaz
      const accountObj = this.accounts.find(acc => acc.phoneNumber === phoneNumber);
      if (accountObj) {
        accountObj.lastError = reason;
        accountObj.status = 'disconnected';
      }
      
      // Emitir estado de desconexión
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'disconnected',
        detail: `Desconectado: ${reason}`,
        progress: 0,
        active: true
      });
      
      // Si es un cierre de sesión intencional, no programar reconexión automática
      if (isIntentionalLogout) {
        utils.log(`Cierre de sesión intencional para ${phoneNumber}, no se intentará reconectar automáticamente`, 'info');
        
        // Eliminar carpeta de sesión si existe
        const sessionDir = `${config.paths.sessions}/${sessionName}`;
        if (fs.existsSync(sessionDir)) {
          try {
            fs.rmdirSync(sessionDir, { recursive: true });
            utils.log(`Directorio de sesión eliminado: ${sessionDir}`, 'success');
          } catch (error) {
            utils.log(`Error al eliminar directorio de sesión: ${error.message}`, 'error');
          }
        }
        return;
      }

      // Planificar reconexión con retraso
      const retryCount = accountObj ? (accountObj.retryCount || 0) : 0;
      const retryDelay = Math.min(60000, 10000 * Math.pow(2, retryCount));
      
      if (accountObj) {
        accountObj.retryCount = retryCount + 1;
      }
      
      utils.log(`Programando reconexión para ${phoneNumber} en ${retryDelay/1000} segundos`, 'info');
      
      // Emitir estado de espera para reconexión
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'disconnected',
        detail: `Reconectando en ${Math.round(retryDelay/1000)} segundos...`,
        progress: 10,
        active: true
      });
      
      setTimeout(() => {
        utils.log(`Intentando reconectar cliente ${phoneNumber}...`, 'info');
        
        // Emitir estado de reconexión iniciada
        this.io.emit('status', {
          sessionName,
          phoneNumber,
          status: 'initializing',
          detail: 'Intentando reconectar...',
          progress: 30,
          active: true
        });
        
        try {
          // Guardar timestamp del intento de reconexión
          if (accountObj) {
            accountObj.lastReconnectAttempt = Date.now();
          }
          
          client.initialize().catch(err => {
            utils.log(`Error al reinicializar cliente ${phoneNumber}: ${err.message}`, 'error');
            if (accountObj) {
              accountObj.lastError = err.message;
              
              // Emitir estado actualizado con el error
              this.io.emit('status', {
                sessionName,
                phoneNumber,
                status: 'error',
                detail: `Error: ${err.message}`,
                progress: 0,
                active: true
              });
            }
          });
        } catch (error) {
          utils.log(`Excepción al intentar reconectar ${phoneNumber}: ${error.message}`, 'error');
          if (accountObj) {
            accountObj.lastError = error.message;
          }
          
          // Emitir estado de error
          this.io.emit('status', {
            sessionName,
            phoneNumber,
            status: 'error',
            detail: `Error: ${error.message}`,
            progress: 0,
            active: true
          });
        }
      }, retryDelay);
    });

    // Actualizar progreso antes de inicializar
    this.io.emit('status', {
      sessionName,
      phoneNumber,
      status: 'initializing',
      detail: 'Conectando con WhatsApp...',
      progress: 50,
      active: true
    });

    // Inicializamos
    client.initialize().catch(err => {
      utils.log(`Error al inicializar cliente ${phoneNumber}: ${err.message}`, 'error');
      
      // Guardar el error para mostrarlo en la interfaz
      const accountObj = this.accounts.find(acc => acc.phoneNumber === phoneNumber);
      if (accountObj) {
        accountObj.lastError = err.message;
        accountObj.status = 'error';
      }
      
      // Emitir estado de error
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'error',
        detail: `Error: ${err.message}`,
        progress: 0,
        active: true
      });
    });

    const account = {
      phoneNumber,
      sessionName,
      client,
      active: true,
      status: 'initializing',
      lastError: null,
      retryCount: 0,
      lastReconnectAttempt: null
    };
    
    this.accounts = [account]; // Reemplazar cualquier cuenta anterior
    this.activeAccount = account;

    return 0;
  }

  // Cerrar sesión
  async logoutAccount(sessionName) {
    try {
      const accountIndex = this.accounts.findIndex(acc => acc.sessionName === sessionName);
      if (accountIndex < 0) {
        throw new Error(`Cuenta no encontrada: ${sessionName}`);
      }

      const account = this.accounts[accountIndex];
      utils.log(`Intentando cerrar sesión de la cuenta ${account.phoneNumber}`, 'info');
      
      if (account.client) {
        await account.client.logout();
        utils.log(`Sesión cerrada para ${account.phoneNumber}`, 'success');

        // Actualizar estado de la cuenta
        account.status = 'disconnected';
        account.lastError = 'Cerrado por usuario';
        
        // Emitir estado actualizado
        this.io.emit('status', {
          sessionName: account.sessionName,
          phoneNumber: account.phoneNumber,
          status: 'disconnected',
          detail: 'Cerrado por usuario',
          progress: 0,
          active: true
        });
        
        // Eliminar carpeta de sesión
        const sessionDir = `${config.paths.sessions}/${sessionName}`;
        if (fs.existsSync(sessionDir)) {
          fs.rmdirSync(sessionDir, { recursive: true });
          utils.log(`Directorio de sesión eliminado: ${sessionDir}`, 'success');
        }
        
        return true;
      } else {
        throw new Error('Cliente no inicializado');
      }
    } catch (error) {
      utils.log(`Error en logoutAccount: ${error.message}`, 'error');
      throw error;
    }
  }

  // Regenerar QR para una cuenta
  async regenerateQR(sessionName) {
    try {
      const accountIndex = this.accounts.findIndex(acc => acc.sessionName === sessionName);
      if (accountIndex < 0) {
        throw new Error(`Cuenta no encontrada: ${sessionName}`);
      }

      const account = this.accounts[accountIndex];
      utils.log(`Regenerando QR para la cuenta ${account.phoneNumber}`, 'info');
      
      // Emitir estado de inicio de regeneración
      this.io.emit('status', {
        sessionName: account.sessionName,
        phoneNumber: account.phoneNumber,
        status: 'initializing',
        detail: 'Regenerando código QR...',
        progress: 20,
        active: true
      });
      
      // Primero, cerrar sesión si existe
      if (account.client) {
        try {
          await account.client.logout();
          utils.log(`Sesión cerrada para regenerar QR: ${account.phoneNumber}`, 'success');

          } catch (logoutError) {
          utils.log(`Error al cerrar sesión: ${logoutError.message}. Continuando con eliminación manual.`, 'warning');
        }
        
        // Eliminar carpeta de sesión
        const sessionDir = `${config.paths.sessions}/${sessionName}`;
        if (fs.existsSync(sessionDir)) {
          fs.rmdirSync(sessionDir, { recursive: true });
          utils.log(`Directorio de sesión eliminado: ${sessionDir}`, 'success');
        }
        
        // Reinicializar cliente
        account.status = 'initializing';
        account.lastError = null;
        this.isGeneratingQR = false;
        
        // Emitir estado actualizado
        this.io.emit('status', {
          sessionName: account.sessionName,
          phoneNumber: account.phoneNumber,
          status: 'initializing',
          detail: 'Preparando nuevo código QR...',
          progress: 40,
          active: true
        });
        
        // Esperar un segundo y reiniciar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reinicializar cliente
        try {
          await account.client.initialize();
          return true;
        } catch (initError) {
          utils.log(`Error al reinicializar cliente: ${initError.message}`, 'error');
          account.lastError = initError.message;
          account.status = 'error';
          
          // Emitir estado de error
          this.io.emit('status', {
            sessionName: account.sessionName,
            phoneNumber: account.phoneNumber,
            status: 'error',
            detail: `Error: ${initError.message}`,
            progress: 0,
            active: true
          });
          
          throw initError;
        }
      } else {
        throw new Error('Cliente no inicializado');
      }
    } catch (error) {
      utils.log(`Error en regenerateQR: ${error.message}`, 'error');
      throw error;
    }
  }

  // Verificar si es mensaje de administrador
  isAdminMessage(message) {
    return config.whatsapp.adminNumbers.includes(message.from) && message.body.startsWith('!');
  }

  // Manejar comandos de admin
  async handleAdminCommand(message, client) {
    const command = message.body.split(' ')[0].toLowerCase();

    if (command === '!responder') {
      const fullParams = message.body.substring(command.length).trim();
      const separatorIndex = fullParams.indexOf('|');
      if (separatorIndex === -1) {
        client.sendMessage(message.from, 'Formato incorrecto. Usa: !responder messageId | respuesta');
        return;
      }
      const messageId = fullParams.substring(0, separatorIndex).trim();
      const response = fullParams.substring(separatorIndex + 1).trim();

      if (!this.pendingResponses || !this.pendingResponses[messageId]) {
        client.sendMessage(message.from, 'No se encontró el mensaje pendiente o ya expiró.');
        return;
      }

      try {
        const pendingMessage = this.pendingResponses[messageId];
        await client.sendMessage(pendingMessage.chatId, response);
        client.sendMessage(message.from, `✅ Respuesta enviada a ${pendingMessage.contact}`);

        const originalMessage = pendingMessage.message.toLowerCase();
        this.updateResponse(originalMessage, response);

        delete this.pendingResponses[messageId];
        client.sendMessage(
          message.from,
          `📝 La respuesta también se ha guardado en la base de conocimientos.`
        );
      } catch (error) {
        utils.log(`Error al enviar respuesta: ${error.message}`, 'error');
        client.sendMessage(message.from, `❌ Error al enviar respuesta: ${error.message}`);
      }
      return;
    }

    // Otros comandos
    const params = message.body.split(' ').slice(1).join(' ');
    switch (command) {
      case '!learn':
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
          client.sendMessage(message.from, `❌ Error al guardar la respuesta.`);
        }
        break;

      case '!status':
        let statusMsg = 'Estado de la cuenta:\n';
        const account = this.accounts[0];
        if (account) {
          statusMsg += `${account.phoneNumber} - ${account.status || 'desconocido'}\n`;
          if (account.lastError) {
            statusMsg += `Error: ${account.lastError}\n`;
          }
        } else {
          statusMsg += 'No hay cuenta configurada\n';
        }
        
        if (this.pendingResponses && Object.keys(this.pendingResponses).length > 0) {
          statusMsg += '\nMensajes pendientes de respuesta: ' + Object.keys(this.pendingResponses).length;
        }
        statusMsg += `\n\nRespuestas configuradas: ${
          Object.keys(this.learningDatabase.responses || {}).length
        }`;
        client.sendMessage(message.from, statusMsg);
        break;

      case '!pendientes':
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
        const reloadSuccess = this.reloadLearningData();
        if (reloadSuccess) {
          client.sendMessage(
            message.from,
            `✅ Datos de aprendizaje recargados correctamente. Respuestas disponibles: ${
              Object.keys(this.learningDatabase.responses || {}).length
            }`
          );
        } else {
          client.sendMessage(message.from, `❌ Error al recargar datos de aprendizaje.`);
        }
        break;

      case '!reconnect':
        if (this.accounts.length > 0 && this.accounts[0].client) {
          client.sendMessage(message.from, `Intentando reconectar la cuenta ${this.accounts[0].phoneNumber}...`);
          
          // Emitir estado de reconexión
          this.io.emit('status', {
            sessionName: this.accounts[0].sessionName,
            phoneNumber: this.accounts[0].phoneNumber,
            status: 'initializing',
            detail: 'Reconectando por comando de administrador...',
            progress: 25,
            active: true
          });
          
          try {
            await this.accounts[0].client.initialize();
            client.sendMessage(message.from, `✅ Reconexión iniciada para ${this.accounts[0].phoneNumber}`);
          } catch (error) {
            client.sendMessage(message.from, `❌ Error al reconectar: ${error.message}`);
          }
        } else {
          client.sendMessage(message.from, 'No se pudo reconectar la cuenta: cliente no inicializado');
        }
        break;

      default:
        client.sendMessage(
          message.from,
          'Comando desconocido. Comandos disponibles: !learn, !status, !pendientes, !responder, !reload, !reconnect'
        );
    }
  }

  // Manejar mensajes entrantes
  async handleIncomingMessage(message, client) {
    utils.log(`Mensaje recibido: "${message.body}" de ${message.from}`, 'info');

    // Emitir al panel
    if (this.io) {
      this.io.emit('botChatMessage', {
        from: message.from,
        message: message.body
      });
    }

    const isGroup = message.from.endsWith('@g.us');
    utils.log(`Es mensaje de grupo: ${isGroup}`, 'info');

    if (message.hasMedia) {
      await this.handleMediaMessage(message, client);
      return;
    }

    if (!isGroup) {
      utils.log('Enviando mensaje de redirección (chat privado)', 'info');
      await client.sendMessage(message.from, config.whatsapp.redirectMessage);
      return;
    }

    // Procesar mensaje de grupo
    utils.log('Procesando mensaje de grupo...', 'info');

    if (!this.learningDatabase || !this.learningDatabase.responses) {
      utils.log('Base de datos de respuestas no inicializada o vacía. Recargando...', 'warning');
      this.loadLearningData();
      if (!this.learningDatabase || !this.learningDatabase.responses) {
        utils.log('No se pudieron cargar respuestas. Usando respuestas por defecto', 'warning');
        this.learningDatabase = JSON.parse(JSON.stringify(config.initialLearningData));
      }
    }

    const messageText = message.body.toLowerCase().trim();
    utils.log(`Buscando respuesta para: "${messageText}"`, 'info');

    let response = null;
    let matchType = '';

    if (this.learningDatabase.responses[messageText]) {
      utils.log(`Coincidencia exacta encontrada para: "${messageText}"`, 'success');
      response = this.learningDatabase.responses[messageText];
      matchType = 'exacta';
    } else {
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

    if (response) {
      utils.log(`Enviando respuesta (coincidencia ${matchType}): "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`, 'info');
      try {
        const clientToUse = this.activeAccount ? this.activeAccount.client : client;
        await clientToUse.sendMessage(message.from, response);
        utils.log('Respuesta enviada exitosamente', 'success');

        // Emitir respuesta al panel
        if (this.io) {
          this.io.emit('botChatMessage', {
            from: 'BOT',
            message: response
          });
        }
      } catch (error) {
        utils.log(`Error al enviar respuesta: ${error.message}`, 'error');
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
      // Intenta generar una respuesta con IA antes de reenviar al administrador
      utils.log('No se encontró respuesta en la base de conocimiento, consultando a la IA...', 'info');

      try {
        // Genera respuesta con OpenAI
        const aiResponse = await aiHandler.generateResponse(messageText);
        
        utils.log(`Respuesta generada por IA: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`, 'success');
        
        // Enviar la respuesta generada por la IA
        const clientToUse = this.activeAccount ? this.activeAccount.client : client;
        await clientToUse.sendMessage(message.from, aiResponse);
        
        // Emitir respuesta al panel
        if (this.io) {
          this.io.emit('botChatMessage', {
            from: 'BOT-AI',
            message: aiResponse
          });
        }
        
        // También reenviar al administrador para que pueda verificar y posiblemente
        // guardar la respuesta en la base de conocimiento
        this.forwardToAdmin(message, client, isGroup, 'Respuesta generada por IA');
        
      } catch (aiError) {
        utils.log(`Error al consultar a la IA: ${aiError.message}`, 'error');
        this.forwardToAdmin(message, client, isGroup, 'Error al generar respuesta con IA');
      }
    }
  }

  // Manejar mensajes multimedia
  async handleMediaMessage(message, client) {
    try {
      await client.sendMessage(
        message.from,
        'Estimado/a, agradezco su interés en obtener más información. Por favor, siéntase en la libertad de comunicarse con nosotros al número 4961260597...'
      );
      if (this.io) {
        this.io.emit('botChatMessage', {
          from: 'BOT',
          message: 'Estimado/a, agradezco su interés en obtener más información. Por favor, siéntase en la libertad de comunicarse con nosotros al número 4961260597...'
        });
      }
    } catch (error) {
      utils.log(`Error al manejar mensaje multimedia: ${error.message}`, 'error');
      await client.sendMessage(message.from, "Lo siento, ocurrió un problema al procesar tu archivo multimedia.");
    }
  }

  // Reenviar mensaje al administrador
  async forwardToAdmin(message, client, isGroup, errorInfo = '') {
    try {
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

      for (const adminNumber of config.whatsapp.adminNumbers) {
        utils.log(`Reenviando mensaje a administrador ${adminNumber}`, 'info');
        let adminMsg = `⚠️ *MENSAJE SIN RESPUESTA* ⚠️\n\n`;
        if (errorInfo) {
          adminMsg += `*ADVERTENCIA*: ${errorInfo}\n\n`;
        }
        adminMsg += `*De:* ${this.pendingResponses[messageId].contact}\n` +
                    `*Chat:* ${message.from}\n` +
                    `*Grupo:* ${isGroup ? 'Sí' : 'No'}\n` +
                    `*Mensaje:* ${message.body}\n\n` +
                    `*DEBUG*: Respuestas disponibles: ${Object.keys(this.learningDatabase.responses || {}).length}\n\n` +
                    `Para responder, escribe:\n` +
                    `!responder ${messageId} | Tu respuesta aquí`;

        await client.sendMessage(adminNumber, adminMsg);
      }
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
    for (const [id, data] of Object.entries(this.pendingResponses)) {
      const ageInHours = (now - data.timestamp) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        oldResponseIds.push(id);
      }
    }
    oldResponseIds.forEach(id => {
      delete this.pendingResponses[id];
    });
    if (oldResponseIds.length > 0) {
      utils.log(`Se eliminaron ${oldResponseIds.length} mensajes pendientes antiguos`, 'info');
    }
  }

  // Método para emitir logs al panel
  logToAdminPanel(msg) {
    console.log(msg);
    if (this.io) {
      this.io.emit('consoleLog', msg);
    }
  }
  
  // Verificar y reconectar cuenta inactiva
  checkAndReconnectInactiveAccounts() {
    // Si no hay cuentas o la única cuenta está conectada, no hacer nada
    if (this.accounts.length === 0 || 
        (this.activeAccount && 
         (this.activeAccount.status === 'ready' || 
          this.activeAccount.status === 'authenticated'))) {
      return;
    }
    
    // Si estamos en proceso de generación de QR, no intentar reconectar
    if (this.isGeneratingQR) {
      utils.log('Generando código QR, no se intentará reconectar', 'info');
      return;
    }
    
    const now = Date.now();
    
    // Solo reconectar si la única cuenta está desconectada y no está en proceso de reconexión
    const account = this.accounts[0];
    if (account && 
        account.status !== 'ready' && 
        account.status !== 'authenticated' &&
        account.status !== 'initializing' &&
        (!account.lastReconnectAttempt || (now - account.lastReconnectAttempt) > 120000)) {
      
      utils.log(`Intentando reconectar cuenta: ${account.phoneNumber}`, 'info');
      account.lastReconnectAttempt = now;
      
      // Emitir estado de reconexión con barra de progreso
      this.io.emit('status', {
        sessionName: account.sessionName,
        phoneNumber: account.phoneNumber,
        status: 'initializing',
        detail: 'Intentando reconectar...',
        progress: 25,
        active: true
      });
      
      try {
        account.client.initialize().catch(err => {
          utils.log(`Error al reconectar ${account.phoneNumber}: ${err.message}`, 'error');
          account.lastError = err.message;
          
          this.io.emit('status', {
            sessionName: account.sessionName,
            phoneNumber: account.phoneNumber,
            status: 'error',
            detail: `Error: ${err.message}`,
            progress: 0,
            active: true
          });
        });
      } catch (error) {
        utils.log(`Excepción al reconectar ${account.phoneNumber}: ${error.message}`, 'error');
        account.lastError = error.message;
        
        // Emitir estado de error
        this.io.emit('status', {
          sessionName: account.sessionName,
          phoneNumber: account.phoneNumber,
          status: 'error',
          detail: `Error: ${error.message}`,
          progress: 0,
          active: true
        });
      }
    }
  }
}

module.exports = WhatsAppManager;