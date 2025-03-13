// Configuración del servidor Express
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const config = require('./config');

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
          // Buscar la cuenta por su sessionName
          const accountIndex = global.whatsappManager.accounts.findIndex(
            account => account.sessionName === sessionName
          );
          
          if (accountIndex >= 0) {
            const account = global.whatsappManager.accounts[accountIndex];
            console.log(`Cerrando sesión de ${account.phoneNumber}`);
            
            // Cerrar sesión de WhatsApp
            if (account.client) {
              account.client.logout()
                .then(() => {
                  console.log(`Sesión cerrada correctamente para ${account.phoneNumber}`);
                  socket.emit('accountLoggedOut', { sessionName, success: true });
                  
                  // Eliminar archivos de sesión si es necesario
                  const sessionDir = `${config.paths.sessions}/${sessionName}`;
                  if (fs.existsSync(sessionDir)) {
                    fs.rmdirSync(sessionDir, { recursive: true });
                    console.log(`Directorio de sesión eliminado: ${sessionDir}`);
                  }
                  
                  // Actualizamos el estado de la cuenta
                  if (global.whatsappManager.activeAccount === account) {
                    // Si era la cuenta activa, cambiar a otra
                    global.whatsappManager.switchToNextAccount();
                  }
                  
                  // Emitir estado actualizado
                  global.whatsappManager.emitCurrentStatus();
                })
                .catch(err => {
                  console.error(`Error al cerrar sesión: ${err.message}`);
                  socket.emit('error', `Error al cerrar sesión: ${err.message}`);
                });
            } else {
              socket.emit('error', 'Cliente no inicializado');
            }
          } else {
            console.warn(`Cuenta no encontrada: ${sessionName}`);
            socket.emit('error', 'Cuenta no encontrada');
          }
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('error', 'Gestor de WhatsApp no inicializado');
        }
      } catch (err) {
        console.error('Error al procesar la solicitud de cierre de sesión:', err);
        socket.emit('error', 'Error interno del servidor');
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
          // Verificar que la cuenta no exista ya
          const existingAccount = global.whatsappManager.accounts.find(
            account => account.phoneNumber === data.phoneNumber
          );
          
          if (existingAccount) {
            socket.emit('error', 'Este número ya está registrado');
            return;
          }
          
          // Agregar la nueva cuenta
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
    
    // Obtener todas las respuestas
    socket.on('getResponses', () => {
      try {
        console.log('Solicitud recibida para obtener respuestas');
        
        if (global.whatsappManager) {
          // Usar el método de WhatsAppManager para obtener respuestas
          const responses = global.whatsappManager.getAllResponses();
          console.log(`Enviando ${Object.keys(responses).length} respuestas al cliente`);
          socket.emit('responsesList', responses);
        } else {
          console.error('WhatsAppManager no inicializado');
          socket.emit('error', 'El gestor de WhatsApp aún no está inicializado');
          
          // Fallback: cargar respuestas directamente del archivo
          if (fs.existsSync(config.files.learningData)) {
            try {
              const data = fs.readFileSync(config.files.learningData, 'utf8');
              const learningData = JSON.parse(data);
              socket.emit('responsesList', learningData.responses || {});
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
    
    // Agregar nueva respuesta
    socket.on('addResponse', ({ trigger, response }) => {
      try {
        console.log(`Intentando guardar respuesta: "${trigger}" -> "${response}"`);
        
        if (!trigger || !response) {
          socket.emit('error', 'La pregunta y respuesta no pueden estar vacías');
          return;
        }
        
        if (global.whatsappManager) {
          // Usar el método de WhatsAppManager para actualizar respuesta
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
          
          // Fallback: guardar directamente en el archivo
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
          // Usar el método de WhatsAppManager para eliminar respuesta
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
          
          // Fallback: eliminar directamente del archivo
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
          // Usar el método de WhatsAppManager para recargar datos
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
    
    // Evento de ping para mantener viva la conexión
    socket.on('ping', () => {
      // Este evento simplemente mantiene la conexión activa
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
