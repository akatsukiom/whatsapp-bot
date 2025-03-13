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
    fs.mkdirSync(config.paths.public);
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
    
    // Obtener todas las respuestas
    socket.on('getResponses', () => {
      try {
        const data = fs.readFileSync(config.files.learningData, 'utf8');
        const learningData = JSON.parse(data);
        socket.emit('responsesList', learningData.responses);
      } catch (err) {
        console.error('Error al leer las respuestas:', err);
        socket.emit('error', 'No se pudieron cargar las respuestas');
      }
    });
    
    // Agregar nueva respuesta
    socket.on('addResponse', ({ trigger, response }) => {
      try {
        const data = fs.readFileSync(config.files.learningData, 'utf8');
        const learningData = JSON.parse(data);
        
        learningData.responses[trigger.toLowerCase()] = response;
        
        fs.writeFileSync(config.files.learningData, JSON.stringify(learningData, null, 2));
        socket.emit('responseAdded');
        console.log(`Respuesta agregada: "${trigger}" -> "${response}"`);
      } catch (err) {
        console.error('Error al agregar respuesta:', err);
        socket.emit('error', 'No se pudo guardar la respuesta');
      }
    });
    
    // Eliminar respuesta
    socket.on('deleteResponse', (trigger) => {
      try {
        const data = fs.readFileSync(config.files.learningData, 'utf8');
        const learningData = JSON.parse(data);
        
        if (learningData.responses[trigger]) {
          delete learningData.responses[trigger];
          
          fs.writeFileSync(config.files.learningData, JSON.stringify(learningData, null, 2));
          socket.emit('responseDeleted');
          console.log(`Respuesta eliminada: "${trigger}"`);
        } else {
          socket.emit('error', 'La respuesta no existe');
        }
      } catch (err) {
        console.error('Error al eliminar respuesta:', err);
        socket.emit('error', 'No se pudo eliminar la respuesta');
      }
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