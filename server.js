// Configuración del servidor Express
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const utils = require('./utils');

function setupServer() {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);

  // Servir archivos estáticos
  app.use(express.static(path.join(__dirname, config.paths.public)));

  // Agregar soporte para JSON en las peticiones
  app.use(express.json());

  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public, { recursive: true });
    console.log(`Carpeta ${config.paths.public} creada correctamente`);
  }

  // Ruta principal
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, config.paths.public, config.files.indexHtml));
  });

  // Ruta de administración
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, config.paths.public, config.files.adminHtml));
  });

  // Configurar eventos Socket.IO para administración
  io.on('connection', (socket) => {
    console.log('Cliente web conectado');

    // Emitir evento inicial para mostrar que el servidor está activo
    socket.emit('status', {
      sessionName: 'sistema',
      phoneNumber: 'Sistema',
      status: 'initializing',
      message: 'Inicializando sistema de WhatsApp Bot'
    });

    // Ping / pong para mantener las conexiones vivas y medir latencia
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Obtener configuración de IA
    socket.on('getAIConfig', () => {
      try {
        socket.emit('aiConfig', {
          apiKey: config.openai.apiKey ? '********' : '',
          model: config.openai.model,
          privateRedirect: config.openai.privateRedirect,
          privateMessage: config.openai.privateMessage
        });
      } catch (err) {
        console.error('Error al obtener configuración de IA:', err);
        socket.emit('error', 'Error al obtener configuración de IA');
      }
    });

    // Actualizar configuración de IA
    socket.on('updateAIConfig', (data) => {
      try {
        console.log('Actualizando configuración de IA');
        
        // Solo actualizar la API key si se proporciona una nueva
        if (data.apiKey && data.apiKey !== '********') {
          config.openai.apiKey = data.apiKey;
        }
        
        config.openai.model = data.model || 'gpt-3.5-turbo';
        config.openai.privateRedirect = data.privateRedirect !== undefined ? data.privateRedirect : true;
        config.openai.privateMessage = data.privateMessage || config.openai.privateMessage;
        
        // Reiniciar el handler de IA si existe
        if (global.aiHandler) {
          global.aiHandler = require('./ai-handler');
        }
        
        socket.emit('aiConfigUpdated');
      } catch (err) {
        console.error('Error al actualizar configuración de IA:', err);
        socket.emit('error', 'Error al actualizar configuración de IA: ' + err.message);
      }
    });

    // Solicitar estado actual de todas las cuentas
    socket.on('requestStatus', () => {
      if (global.whatsappManager) {
        global.whatsappManager.emitCurrentStatus();
      } else {
        console.log('WhatsAppManager aún no está inicializado');
        socket.emit('status', {
          sessionName: 'sistema',
          phoneNumber: 'Sistema',
          status: 'error',
          message: 'El gestor de WhatsApp aún no está inicializado'
        });
      }
    });

    // Cerrar sesión de una cuenta
    socket.on('logoutAccount', (sessionName) => {
      try {
        console.log(`Solicitud recibida para cerrar sesión de cuenta: ${sessionName}`);
        if (global.whatsappManager) {
          const accountIndex = global.whatsappManager.accounts.findIndex(
            account => account.sessionName === sessionName
          );
          if (accountIndex >= 0) {
            const account = global.whatsappManager.accounts[accountIndex];
            console.log(`Cerrando sesión de ${account.phoneNumber}`);
            if (account.client) {
              account.client.logout()
                .then(() => {
                  console.log(`Sesión cerrada correctamente para ${account.phoneNumber}`);
                  socket.emit('accountLoggedOut', { sessionName, success: true });
                  const sessionDir = `${config.paths.sessions}/${sessionName}`;
                  if (fs.existsSync(sessionDir)) {
                    fs.rmdirSync(sessionDir, { recursive: true });
                    console.log(`Directorio de sesión eliminado: ${sessionDir}`);
                  }
                  if (global.whatsappManager.activeAccount === account) {
                    global.whatsappManager.switchToNextAccount();
                  }
                  global.whatsappManager.emitCurrentStatus();
                })
                .catch(err => {
                  console.error(`Error al cerrar sesión: ${err.message}`);
                  socket.emit('accountLoggedOut', { sessionName, success: false, error: err.message });
                });
            } else {
              socket.emit('accountLoggedOut', { sessionName, success: false, error: 'Cliente no inicializado' });
            }
          } else {
            console.warn(`Cuenta no encontrada: ${sessionName}`);
            socket.emit('accountLoggedOut', { sessionName, success: false, error: 'Cuenta no encontrada' });
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('accountLoggedOut', { sessionName, success: false, error: 'Gestor de WhatsApp no inicializado' });
        }
      } catch (err) {
        console.error('Error al procesar la solicitud de cierre de sesión:', err);
        socket.emit('accountLoggedOut', { sessionName, success: false, error: 'Error interno del servidor' });
      }
    });

    // Solicitar regeneración del código QR
    socket.on('refreshQR', (sessionName) => {
      try {
        console.log(`Solicitud recibida para regenerar QR de cuenta: ${sessionName}`);
        if (global.whatsappManager) {
          const accountIndex = global.whatsappManager.accounts.findIndex(
            account => account.sessionName === sessionName
          );
          
          if (accountIndex >= 0) {
            const account = global.whatsappManager.accounts[accountIndex];
            
            // Si ya hay una solicitud de QR en progreso, no generar otra
            if (account.qrGenerationInProgress) {
              console.log(`Ya hay una generación de QR en progreso para ${account.phoneNumber}, ignorando solicitud`);
              socket.emit('qrRefreshError', { 
                sessionName, 
                error: 'Ya hay una generación de QR en progreso'
              });
              return;
            }
            
            // Marcar que hay una generación de QR en progreso
            account.qrGenerationInProgress = true;
            
            // Establecer un timeout para limpiar esta bandera después de un tiempo
            setTimeout(() => {
              if (account.qrGenerationInProgress) {
                account.qrGenerationInProgress = false;
                console.log(`Timeout de generación de QR para ${account.phoneNumber}`);
              }
            }, 30000); // 30 segundos de timeout
            
            // Solo regenerar si hay cliente
            if (account.client) {
              socket.emit('qrRefreshStarted', { sessionName });
              
              // Intentar regenerar el QR
              global.whatsappManager.regenerateQR(sessionName)
                .then(() => {
                  console.log(`QR regenerado correctamente para ${account.phoneNumber}`);
                  account.qrGenerationInProgress = false;
                })
                .catch(err => {
                  console.error(`Error al regenerar QR: ${err.message}`);
                  account.qrGenerationInProgress = false;
                  socket.emit('qrRefreshError', { 
                    sessionName, 
                    error: err.message
                  });
                });
            } else {
              account.qrGenerationInProgress = false;
              socket.emit('qrRefreshError', { 
                sessionName, 
                error: 'Cliente no inicializado'
              });
            }
          } else {
            console.warn(`Cuenta no encontrada para regenerar QR: ${sessionName}`);
            socket.emit('qrRefreshError', { 
              sessionName, 
              error: 'Cuenta no encontrada'
            });
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('qrRefreshError', { 
            sessionName, 
            error: 'Gestor de WhatsApp no inicializado'
          });
        }
      } catch (err) {
        console.error('Error al procesar la solicitud de regeneración de QR:', err);
        socket.emit('qrRefreshError', { 
          sessionName, 
          error: 'Error interno del servidor'
        });
      }
    });

    // Agregar nueva cuenta
    socket.on('addAccount', (data) => {
      try {
        console.log(`Solicitud recibida para agregar nueva cuenta: ${data.phoneNumber}`);
        if (!data.phoneNumber) {
          socket.emit('error', 'Número de teléfono no proporcionado');
          return;
        }
        if (global.whatsappManager) {
          const existingAccount = global.whatsappManager.accounts.find(
            account => account.phoneNumber === data.phoneNumber
          );
          if (existingAccount) {
            socket.emit('error', 'Este número ya está registrado');
            return;
          }
          const index = global.whatsappManager.addAccount(
            data.phoneNumber, 
            data.sessionName || `cuenta_${Date.now()}`
          );
          console.log(`Nueva cuenta agregada: ${data.phoneNumber} (índice: ${index})`);
          socket.emit('accountAdded', { 
            phoneNumber: data.phoneNumber, 
            index: index,
            success: true 
          });
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
        }
      } catch (err) {
        console.error('Error al agregar nueva cuenta:', err);
        socket.emit('error', 'Error interno del servidor');
      }
    });

    // Enviar información del sistema
    socket.on('requestSystemInfo', () => {
      try {
        if (global.whatsappManager) {
          socket.emit('systemInfo', {
            accounts: global.whatsappManager.accounts.length,
            activeAccount: global.whatsappManager.activeAccount ? 
                          global.whatsappManager.activeAccount.phoneNumber : 'Ninguna',
            pendingMessages: Object.keys(global.whatsappManager.pendingResponses || {}).length,
            responses: Object.keys(global.whatsappManager.learningDatabase.responses || {}).length,
            timestamp: Date.now()
          });
        } else {
          socket.emit('systemInfo', {
            accounts: 0,
            activeAccount: 'Ninguna',
            pendingMessages: 0,
            responses: 0,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error al enviar información del sistema:', error);
        socket.emit('error', 'Error al obtener información del sistema');
      }
    });

    // Forzar verificación de cuentas inactivas
    socket.on('checkInactiveAccounts', () => {
      try {
        if (global.whatsappManager) {
          console.log('Forzando verificación de cuentas inactivas...');
          global.whatsappManager.checkAndReconnectInactiveAccounts();
          socket.emit('checkInactiveAccountsStarted');
        } else {
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
        }
      } catch (err) {
        console.error('Error al verificar cuentas inactivas:', err);
        socket.emit('error', 'Error al verificar cuentas inactivas: ' + err.message);
      }
    });

    // Obtener todas las respuestas
    socket.on('getResponses', (callback) => {
      try {
        console.log('Solicitud recibida para obtener respuestas');
        if (global.whatsappManager) {
          const responses = global.whatsappManager.getAllResponses();
          console.log(`Enviando ${Object.keys(responses).length} respuestas al cliente`);
          
          // Si hay un callback, lo usamos para responder
          if (typeof callback === 'function') {
            callback(responses);
          } else {
            socket.emit('responsesList', responses);
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('error', 'El gestor de WhatsApp aún no está inicializado');
          if (fs.existsSync(config.files.learningData)) {
            try {
              const data = fs.readFileSync(config.files.learningData, 'utf8');
              const learningData = JSON.parse(data);
              
              if (typeof callback === 'function') {
                callback(learningData.responses || {});
              } else {
                socket.emit('responsesList', learningData.responses || {});
              }
            } catch (parseError) {
              console.error('Error al parsear JSON:', parseError);
              socket.emit('error', 'El archivo de respuestas contiene JSON inválido');
            }
          } else {
            socket.emit('error', 'Archivo de respuestas no encontrado');
          }
        }
      } catch (err) {
        console.error('Error detallado al leer las respuestas:', err);
        console.error('Mensaje de error:', err.message);
        console.error('Stack de error:', err.stack);
        socket.emit('error', 'No se pudieron cargar las respuestas: ' + err.message);
      }
    });

    // Exportar respuestas (opcional si se usa callback en getResponses)
    socket.on('exportResponses', () => {
      try {
        console.log('Solicitud recibida para exportar respuestas');
        if (global.whatsappManager) {
          const responses = global.whatsappManager.getAllResponses();
          socket.emit('responsesExport', { responses });
        } else {
          socket.emit('error', 'El gestor de WhatsApp no está inicializado');
        }
      } catch (err) {
        console.error('Error al exportar respuestas:', err);
        socket.emit('error', 'Error al exportar respuestas: ' + err.message);
      }
    });

    // Importar respuestas
    socket.on('importResponses', (data) => {
      try {
        console.log(`Solicitud recibida para importar respuestas. Reemplazar: ${data.replace}`);
        
        if (!data.responses || typeof data.responses !== 'object') {
          socket.emit('error', 'Formato de datos inválido');
          return;
        }
        
        if (global.whatsappManager) {
          // Obtener respuestas actuales si no es reemplazo total
          let currentResponses = {};
          if (!data.replace) {
            currentResponses = global.whatsappManager.getAllResponses();
          }
          
          // Combinar respuestas actuales con las nuevas
          const mergedResponses = {...currentResponses, ...data.responses};
          
          // Verificar cada respuesta e importarla
          let importedCount = 0;
          for (const [trigger, response] of Object.entries(mergedResponses)) {
            if (typeof trigger === 'string' && typeof response === 'string') {
              global.whatsappManager.updateResponse(trigger, response);
              importedCount++;
            }
          }
          
          socket.emit('responsesImported', { count: importedCount });
          io.emit('responsesUpdated');
          
          // Recargar respuestas en la interfaz
          const responses = global.whatsappManager.getAllResponses();
          socket.emit('responsesList', responses);
          
          console.log(`Importación completada: ${importedCount} respuestas importadas`);
        } else {
          socket.emit('error', 'El gestor de WhatsApp no está inicializado');
        }
      } catch (err) {
        console.error('Error al importar respuestas:', err);
        socket.emit('error', 'Error al importar respuestas: ' + err.message);
      }
    });

    // Agregar nueva respuesta
    socket.on('addResponse', ({ trigger, response }) => {
      try {
        console.log(`Intentando guardar respuesta: "${trigger}" -> "${response}"`);
        if (!trigger || !response) {
          socket.emit('error', 'La pregunta y respuesta no pueden estar vacías');
          return;
        }
        if (global.whatsappManager) {
          const success = global.whatsappManager.updateResponse(trigger, response);
          if (success) {
            console.log(`Respuesta agregada: "${trigger}" -> "${response}"`);
            socket.emit('responseAdded');
            io.emit('responsesUpdated');
          } else {
            socket.emit('error', 'Error al guardar la respuesta');
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
          try {
            let learningData = { responses: {} };
            if (fs.existsSync(config.files.learningData)) {
              const data = fs.readFileSync(config.files.learningData, 'utf8');
              learningData = JSON.parse(data);
              if (!learningData.responses) {
                learningData.responses = {};
              }
            }
            learningData.responses[trigger.toLowerCase()] = response;
            fs.writeFileSync(config.files.learningData, JSON.stringify(learningData, null, 2));
            socket.emit('responseAdded');
            io.emit('responsesUpdated');
          } catch (fileError) {
            console.error('Error al guardar en archivo:', fileError);
            socket.emit('error', 'No se pudo guardar la respuesta: ' + fileError.message);
          }
        }
      } catch (err) {
        console.error('Error detallado al agregar respuesta:', err);
        console.error('Mensaje de error:', err.message);
        console.error('Stack de error:', err.stack);
        socket.emit('error', 'No se pudo guardar la respuesta: ' + err.message);
      }
    });

    // Eliminar respuesta
    socket.on('deleteResponse', (trigger) => {
      try {
        console.log(`Intentando eliminar respuesta: "${trigger}"`);
        if (global.whatsappManager) {
          const success = global.whatsappManager.deleteResponse(trigger);
          if (success) {
            console.log(`Respuesta eliminada: "${trigger}"`);
            socket.emit('responseDeleted');
            io.emit('responsesUpdated');
          } else {
            socket.emit('error', 'No se pudo eliminar la respuesta');
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
          try {
            if (fs.existsSync(config.files.learningData)) {
              const data = fs.readFileSync(config.files.learningData, 'utf8');
              const learningData = JSON.parse(data);
              if (learningData.responses && learningData.responses[trigger]) {
                delete learningData.responses[trigger];
                fs.writeFileSync(config.files.learningData, JSON.stringify(learningData, null, 2));
                socket.emit('responseDeleted');
                io.emit('responsesUpdated');
              } else {
                socket.emit('error', 'La respuesta no existe');
              }
            } else {
              socket.emit('error', 'El archivo de respuestas no existe');
            }
          } catch (fileError) {
            console.error('Error al eliminar del archivo:', fileError);
            socket.emit('error', 'No se pudo eliminar la respuesta: ' + fileError.message);
          }
        }
      } catch (err) {
        console.error('Error detallado al eliminar respuesta:', err);
        console.error('Mensaje de error:', err.message);
        console.error('Stack de error:', err.stack);
        socket.emit('error', 'No se pudo eliminar la respuesta: ' + err.message);
      }
    });

    // Forzar recarga de respuestas
    socket.on('forceReload', () => {
      try {
        console.log('Solicitando recarga forzada de respuestas');
        if (global.whatsappManager) {
          const success = global.whatsappManager.reloadLearningData();
          if (success) {
            const responses = global.whatsappManager.getAllResponses();
            socket.emit('responsesList', responses);
            console.log('Recarga forzada completada');
          } else {
            socket.emit('error', 'Error al recargar respuestas');
          }
        } else {
          console.warn('WhatsAppManager no inicializado, cargando directamente del archivo');
          if (fs.existsSync(config.files.learningData)) {
            const data = fs.readFileSync(config.files.learningData, 'utf8');
            const learningData = JSON.parse(data);
            socket.emit('responsesList', learningData.responses || {});
            console.log('Recarga forzada desde archivo completada');
          } else {
            console.warn('No se pudo realizar la recarga forzada, archivo no encontrado');
            socket.emit('error', 'Archivo de respuestas no encontrado');
          }
        }
      } catch (err) {
        console.error('Error en recarga forzada:', err);
        socket.emit('error', 'Error al recargar respuestas: ' + err.message);
      }
    });

    // Evento para agregar respuesta rápida
    socket.on('addQuickResponse', ({ trigger, response }) => {
      try {
        console.log(`Agregando respuesta rápida: "${trigger}" -> "${response}"`);
        if (global.whatsappManager) {
          const success = global.whatsappManager.updateResponse(trigger, response);
          if (success) {
            console.log(`Respuesta rápida agregada: "${trigger}" -> "${response}"`);
            socket.emit('quickResponseAdded');
            io.emit('responsesUpdated');
          } else {
            socket.emit('error', 'Error al agregar la respuesta rápida');
          }
        } else {
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
        }
      } catch (err) {
        console.error('Error al agregar respuesta rápida:', err);
        socket.emit('error', 'No se pudo agregar la respuesta rápida: ' + err.message);
      }
    });

    // Evento para mensajes enviados desde el panel por el administrador
    socket.on('adminChatMessage', (msg) => {
      console.log('Mensaje del admin:', msg);
      io.emit('botChatMessage', {
        from: 'ADMIN',
        message: msg
      });
      // Aquí podrías enviar el mensaje a un usuario real si lo deseas
      /*
      if (global.whatsappManager && global.whatsappManager.activeAccount && global.whatsappManager.activeAccount.client) {
        global.whatsappManager.activeAccount.client.sendMessage('521234567890@c.us', msg);
      }
      */
    });
    
    // Emitir periódicamente el latido cardiaco
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat', { timestamp: Date.now() });
    }, 5000);
    
    // Limpiar intervalos al desconectar
    socket.on('disconnect', () => {
      console.log('Cliente web desconectado');
      clearInterval(heartbeatInterval);
    });
  });

  // Puerto para Railway o local
  const PORT = config.server.port;
  server.listen(PORT, () => {
    console.log(`Servidor web iniciado en el puerto ${PORT}`);
  });

  return { app, server, io };
}

module.exports = setupServer;