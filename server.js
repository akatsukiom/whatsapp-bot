// Configuración del servidor Express
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Incluir la ruta de publicación
const publicarRoute = require('./routes/publicar');

// Cargar variables de entorno
dotenv.config();

// Asegurar que existe el directorio de templates
const templatesDir = path.join(__dirname, 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
  console.log(`Creado directorio de plantillas: ${templatesDir}`);
}

// Importar módulos de configuración
let config;
try {
  config = require('./modules/config');
} catch (err) {
  console.error('Error al cargar config.js:', err);
  // Configuración por defecto
  config = {
    paths: {
      public: path.resolve(__dirname, 'public'),
      templates: path.resolve(__dirname, 'templates'),
      sessions: path.resolve(__dirname, '.wwebjs_auth')
    },
    files: {
      indexHtml: 'index.html',
      adminHtml: 'admin.html',
      learningData: path.resolve(__dirname, 'learning-data.json')
    },
    server: {
      port: process.env.PORT || 5000,
      host: process.env.HOST || 'localhost'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      privateRedirect: process.env.PRIVATE_REDIRECT !== 'false',
      privateMessage: process.env.PRIVATE_MESSAGE || 'Tu mensaje ha sido enviado a un chat privado. Responderemos pronto.'
    }
  };
}

// Asegurar que existen los directorios necesarios
function ensureDirectories() {
  // Crear carpeta public si no existe
  if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
    console.log(`Carpeta 'public' creada correctamente en ${path.join(__dirname, 'public')}`);
  }
  
  // Crear carpeta .wwebjs_auth si no existe
  if (!fs.existsSync(path.join(__dirname, '.wwebjs_auth'))) {
    fs.mkdirSync(path.join(__dirname, '.wwebjs_auth'), { recursive: true });
    console.log(`Carpeta '.wwebjs_auth' creada correctamente en ${path.join(__dirname, '.wwebjs_auth')}`);
  }
  
  // Crear carpeta logs si no existe
  if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    console.log(`Carpeta 'logs' creada correctamente en ${path.join(__dirname, 'logs')}`);
  }
}

function setupServer() {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    }
  });

  // Hacer io disponible globalmente para usar en otros archivos
  global.io = io;

  // Asegurar que todas las carpetas necesarias existen
  ensureDirectories();

  // Servir archivos estáticos
  app.use(express.static(path.join(__dirname, 'public')));

  // Agregar soporte para JSON en las peticiones
  app.use(express.json());

  // Agregar rutas de API
  app.use('/api', publicarRoute);

  // Ruta principal
  app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    // Si no existe el archivo, generarlo
    if (!fs.existsSync(indexPath)) {
      try {
        const createIndexHtml = require('./templates/index-template');
        createIndexHtml();
        console.log('Archivo index.html generado al vuelo');
      } catch (err) {
        console.error('Error al generar index.html:', err);
        return res.status(500).send('Error: No se pudo generar la página principal. Revise los logs del servidor.');
      }
    }
    
    res.sendFile(indexPath);
  });

  // Ruta de administración
  app.get('/admin', (req, res) => {
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    
    // Si no existe el archivo, generarlo
    if (!fs.existsSync(adminPath)) {
      try {
        const createAdminHtml = require('./templates/admin-template');
        createAdminHtml();
        console.log('Archivo admin.html generado al vuelo');
      } catch (err) {
        console.error('Error al generar admin.html:', err);
        return res.status(500).send('Error: No se pudo generar el panel de administración. Revise los logs del servidor.');
      }
    }
    
    res.sendFile(adminPath);
  });

  // Ruta para obtener logs recientes a través de API
  app.get('/api/logs', (req, res) => {
    try {
      const logPath = path.join(__dirname, 'logs', 'app.log');
      let logs = [];
      
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        logs = content.split('\n').filter(Boolean).slice(-100);
      }
      
      res.json({ logs });
    } catch (error) {
      console.error('Error al leer logs:', error);
      res.status(500).json({ error: 'Error al leer logs' });
    }
  });

  // Configurar eventos Socket.IO para administración
  io.on('connection', (socket) => {
    console.log('Cliente web conectado');

    // Emitir evento inicial para mostrar que el servidor está activo
    socket.emit('status', {
      sessionName: 'sistema',
      phoneNumber: 'Sistema',
      status: 'initializing',
      detail: 'Inicializando sistema de WhatsApp Bot',
      progress: 20,
      message: 'Inicializando sistema de WhatsApp Bot'
    });

    // Enviar mensaje de log para confirmar conexión
    socket.emit('consoleLog', 'Conexión establecida con el servidor. ' + new Date().toISOString());

    // Ping / pong para mantener las conexiones vivas y medir latencia
    socket.on('ping', () => {
      socket.emit('heartbeat', { timestamp: Date.now() });
    });

    // Obtener configuración de IA
    socket.on('getAIConfig', () => {
      try {
        socket.emit('aiConfig', {
          apiKey: process.env.OPENAI_API_KEY ? '********' : '',
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
        
        // Crear o actualizar archivo .env
        let envContent = '';
        
        // Si hay una API key nueva y no es el placeholder, actualizarla
        if (data.apiKey && data.apiKey !== '********') {
          envContent += `OPENAI_API_KEY=${data.apiKey}\n`;
          process.env.OPENAI_API_KEY = data.apiKey;
        } else if (process.env.OPENAI_API_KEY) {
          // Mantener la API key existente
          envContent += `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}\n`;
        }
        
        // Guardar resto de configuraciones en el .env
        envContent += `OPENAI_MODEL=${data.model || 'gpt-3.5-turbo'}\n`;
        envContent += `PRIVATE_REDIRECT=${data.privateRedirect !== undefined ? data.privateRedirect : true}\n`;
        envContent += `PRIVATE_MESSAGE=${data.privateMessage || config.openai.privateMessage}\n`;
        
        // Crear carpeta si no existe
        const envDir = path.dirname('.env');
        if (!fs.existsSync(envDir)) {
          fs.mkdirSync(envDir, { recursive: true });
        }
        
        // Guardar archivo .env
        fs.writeFileSync('.env', envContent);
        
        // Recargar variables de entorno
        dotenv.config();
        
        // Actualizar configuración en memoria
        config.openai.model = data.model || 'gpt-3.5-turbo';
        config.openai.privateRedirect = data.privateRedirect !== undefined ? data.privateRedirect : true;
        config.openai.privateMessage = data.privateMessage || config.openai.privateMessage;
        
        // Reiniciar el handler de IA si existe
        if (global.aiHandler) {
          global.aiHandler = require('./ai-handler');
        }
        
        console.log('Configuración de IA actualizada correctamente');
        socket.emit('aiConfigUpdated');
      } catch (err) {
        console.error('Error al actualizar configuración de IA:', err);
        socket.emit('error', 'Error al actualizar configuración de IA: ' + err.message);
      }
    });

    // Solicitar estado actual
    socket.on('requestStatus', () => {
      if (global.whatsappManager) {
        global.whatsappManager.emitCurrentStatus();
      } else {
        console.log('WhatsAppManager aún no está inicializado');
        socket.emit('status', {
          sessionName: 'sistema',
          phoneNumber: 'Sistema',
          status: 'error',
          detail: 'El gestor de WhatsApp aún no está inicializado',
          progress: 0
        });
      }
    });

    // Solicitar información del sistema
    socket.on('requestSystemInfo', () => {
      if (global.whatsappManager) {
        const accounts = global.whatsappManager.accounts;
        socket.emit('systemInfo', {
          accounts: accounts.length,
          connectedAccounts: accounts.filter(a => a.status === 'ready' || a.status === 'authenticated').length,
          activeAccount: accounts[global.whatsappManager.activeAccountIndex]?.phoneNumber || '-'
        });
      } else {
        socket.emit('systemInfo', {
          accounts: 0,
          connectedAccounts: 0,
          activeAccount: '-'
        });
      }
    });

    // Cerrar sesión
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
                  const sessionDir = path.join(__dirname, '.wwebjs_auth', sessionName);
                  if (fs.existsSync(sessionDir)) {
                    fs.rm(sessionDir, { recursive: true }, (err) => {
                      if (err) {
                        console.error(`Error al eliminar directorio de sesión: ${err.message}`);
                      } else {
                        console.log(`Directorio de sesión eliminado: ${sessionDir}`);
                      }
                    });
                  }
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

    // Eliminar cuenta completamente
    socket.on('removeAccount', async (sessionName) => {
      try {
        console.log(`Solicitud recibida para eliminar cuenta: ${sessionName}`);
        
        if (global.whatsappManager) {
          // Usar el método existente para eliminar la cuenta
          const result = await global.whatsappManager.removeAccount(sessionName);
          
          if (result) {
            console.log(`Cuenta ${sessionName} eliminada correctamente`);
            socket.emit('accountRemoved', { 
              sessionName, 
              success: true 
            });
            
            // Notificar a todos los clientes para que actualicen su estado
            io.emit('systemInfo', {
              accounts: global.whatsappManager.accounts.length,
              connectedAccounts: global.whatsappManager.accounts.filter(a => 
                a.status === 'ready' || a.status === 'authenticated'
              ).length,
              activeAccount: global.whatsappManager.accounts[global.whatsappManager.activeAccountIndex]?.phoneNumber || '-'
            });
          } else {
            console.error(`Error al eliminar cuenta ${sessionName}: No se encontró la cuenta o hubo un problema interno`);
            socket.emit('accountRemoved', { 
              sessionName, 
              success: false, 
              error: 'No se encontró la cuenta o hubo un problema al eliminarla' 
            });
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('accountRemoved', { 
            sessionName, 
            success: false, 
            error: 'Gestor de WhatsApp no inicializado' 
          });
        }
      } catch (err) {
        console.error('Error al procesar la solicitud de eliminación de cuenta:', err);
        socket.emit('accountRemoved', { 
          sessionName, 
          success: false, 
          error: 'Error interno del servidor: ' + err.message 
        });
      }
    });

    // Solicitar regeneración del código QR
    socket.on('refreshQR', (sessionName) => {
      try {
        console.log(`Solicitud recibida para regenerar QR de cuenta: ${sessionName}`);
        if (global.whatsappManager) {
          global.whatsappManager.regenerateQR(sessionName)
            .then(() => {
              console.log(`QR regenerado correctamente para la cuenta ${sessionName}`);
            })
            .catch(err => {
              console.error(`Error al regenerar QR: ${err.message}`);
              socket.emit('qrRefreshError', { 
                sessionName, 
                error: err.message
              });
            });
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

    // Forzar desconexión y regeneración completa
    socket.on('forceReconnect', (sessionName) => {
      try {
        console.log(`Solicitud recibida para forzar reconexión de cuenta: ${sessionName}`);
        if (global.whatsappManager) {
          global.whatsappManager.forceDisconnectAndRegenerateQR(sessionName)
            .then(() => {
              console.log(`Reconexión forzada completada para la cuenta ${sessionName}`);
            })
            .catch(err => {
              console.error(`Error al forzar reconexión: ${err.message}`);
              socket.emit('qrRefreshError', { 
                sessionName, 
                error: err.message
              });
            });
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('qrRefreshError', { 
            sessionName, 
            error: 'Gestor de WhatsApp no inicializado'
          });
        }
      } catch (err) {
        console.error('Error al procesar la solicitud de reconexión forzada:', err);
        socket.emit('qrRefreshError', { 
          sessionName, 
          error: 'Error interno del servidor'
        });
      }
    });
// Solicitar verificación de cuentas inactivas
    socket.on('checkInactiveAccounts', () => {
      try {
        console.log('Solicitud recibida para verificar cuentas inactivas');
        socket.emit('checkInactiveAccountsStarted');
        
        if (global.whatsappManager) {
          // Implementar verificación de cuentas inactivas
          // (Este código es un placeholder, implementa tu lógica aquí)
          console.log('Verificando cuentas inactivas...');
          
          // Notificar finalización
          setTimeout(() => {
            socket.emit('checkInactiveAccountsFinished', {
              message: 'Verificación de cuentas inactivas completada'
            });
          }, 2000);
        } else {
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
        }
      } catch (err) {
        console.error('Error al verificar cuentas inactivas:', err);
        socket.emit('error', 'Error al verificar cuentas inactivas: ' + err.message);
      }
    });

    // Agregar una nueva cuenta de WhatsApp
    socket.on('addAccount', (data) => {
      try {
        console.log(`Solicitud recibida para agregar cuenta: ${data.phoneNumber}`);
        
        if (global.whatsappManager) {
          const success = global.whatsappManager.addAccount(data.phoneNumber, data.sessionName);
          
          if (success) {
            socket.emit('accountAdded', {
              success: true,
              phoneNumber: data.phoneNumber,
              sessionName: data.sessionName
            });
          } else {
            socket.emit('accountAdded', {
              success: false,
              error: 'No se pudo agregar la cuenta, verifica los logs del servidor'
            });
          }
        } else {
          socket.emit('accountAdded', {
            success: false,
            error: 'Gestor de WhatsApp no inicializado'
          });
        }
      } catch (err) {
        console.error('Error al agregar cuenta:', err);
        socket.emit('accountAdded', {
          success: false,
          error: 'Error interno del servidor: ' + err.message
        });
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
          
          // Intentar cargar directamente del archivo si existe
          const learningDataPath = path.join(__dirname, 'learning-data.json');
          if (fs.existsSync(learningDataPath)) {
            try {
              const data = fs.readFileSync(learningDataPath, 'utf8');
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
        console.error('Error al leer las respuestas:', err);
        socket.emit('error', 'No se pudieron cargar las respuestas: ' + err.message);
      }
    });

    // Evento específico para exportación de respuestas
    socket.on('getResponsesForExport', () => {
      try {
        console.log('Solicitud recibida para exportar respuestas');
        if (global.whatsappManager) {
          const responses = global.whatsappManager.getAllResponses();
          socket.emit('responsesForExport', responses);
        } else {
          // Intentar cargar directamente del archivo
          const learningDataPath = path.join(__dirname, 'learning-data.json');
          if (fs.existsSync(learningDataPath)) {
            try {
              const data = fs.readFileSync(learningDataPath, 'utf8');
              const learningData = JSON.parse(data);
              socket.emit('responsesForExport', learningData.responses || {});
            } catch (parseError) {
              console.error('Error al parsear JSON:', parseError);
              socket.emit('error', 'El archivo de respuestas contiene JSON inválido');
            }
          } else {
            socket.emit('error', 'Archivo de respuestas no encontrado');
          }
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
          
          // Intento directo con el archivo si el manager no está disponible
          try {
            const learningDataPath = path.join(__dirname, 'learning-data.json');
            let learningData = { responses: {} };
            
            if (fs.existsSync(learningDataPath)) {
              const data = fs.readFileSync(learningDataPath, 'utf8');
              learningData = JSON.parse(data);
              if (!learningData.responses) {
                learningData.responses = {};
              }
            }
            
            learningData.responses[trigger.toLowerCase()] = response;
            fs.writeFileSync(learningDataPath, JSON.stringify(learningData, null, 2));
            socket.emit('responseAdded');
            io.emit('responsesUpdated');
          } catch (fileError) {
            console.error('Error al guardar en archivo:', fileError);
            socket.emit('error', 'No se pudo guardar la respuesta: ' + fileError.message);
          }
        }
      } catch (err) {
        console.error('Error al agregar respuesta:', err);
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
          
          // Intento directo con el archivo si el manager no está disponible
          try {
            const learningDataPath = path.join(__dirname, 'learning-data.json');
            if (fs.existsSync(learningDataPath)) {
              const data = fs.readFileSync(learningDataPath, 'utf8');
              const learningData = JSON.parse(data);
              if (learningData.responses && learningData.responses[trigger]) {
                delete learningData.responses[trigger];
                fs.writeFileSync(learningDataPath, JSON.stringify(learningData, null, 2));
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
        console.error('Error al eliminar respuesta:', err);
        socket.emit('error', 'No se pudo eliminar la respuesta: ' + err.message);
      }
    });

    // Verificar si un trigger ya existe como respuesta rápida
    socket.on('checkQuickResponse', (data, callback) => {
      try {
        if (global.whatsappManager) {
          const responses = global.whatsappManager.getAllResponses();
          const exists = responses[data.trigger] !== undefined;
          callback(exists);
        } else {
          callback(false);
        }
      } catch (err) {
        console.error('Error al verificar respuesta rápida:', err);
        callback(false);
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
          const learningDataPath = path.join(__dirname, 'learning-data.json');
          if (fs.existsSync(learningDataPath)) {
            const data = fs.readFileSync(learningDataPath, 'utf8');
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

  // IMPORTANTE: NO INICIAR EL SERVIDOR AQUÍ
  // Solo devolver los objetos app, server e io
  return { app, server, io };
}

// Exportar la función setupServer
module.exports = setupServer;