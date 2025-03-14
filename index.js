// Punto de entrada principal para el WhatsApp Bot Manager
const config = require('./config');
const setupServer = require('./server');
const WhatsAppManager = require('./whatsapp-manager');
const createIndexHtml = require('./templates/index-template');
const createAdminHtml = require('./templates/admin-template');
const utils = require('./utils');

// Función para verificar periódicamente la salud de las conexiones
function setupHealthCheck(manager) {
  setInterval(() => {
    try {
      utils.log('Realizando verificación de salud de las conexiones...', 'info');
      
      // Intentar reconectar cuentas inactivas
      manager.checkAndReconnectInactiveAccounts();
      
      // Emitir estado actualizado
      manager.emitCurrentStatus();
    } catch (error) {
      utils.log(`Error en la verificación de salud: ${error.message}`, 'error');
    }
  }, 60000); // Verificar cada minuto
}

// Función principal
async function main() {
  // Verificar directorios necesarios
  utils.ensureDirectories();
  
  // Verificar permisos de escritura en archivos clave
  function checkFilePermissions() {
    const fs = require('fs');
    try {
      // Verificar learning-data.json
      const learningDataPath = config.paths.learningData || config.files.learningData;
      
      // Intentar escribir en un archivo temporal para verificar permisos
      const testFile = `${learningDataPath}.test`;
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      utils.log('Permisos de escritura verificados correctamente', 'success');
      return true;
    } catch (error) {
      utils.log(`Error al verificar permisos: ${error.message}`, 'error');
      return false;
    }
  }
  
  // Comprobar permisos
  checkFilePermissions();
  
  // Crear archivos necesarios
  createIndexHtml();
  createAdminHtml();
  utils.createLearningDataFile();
  
  // Crear una copia de seguridad antes de iniciar (si existe el archivo)
  utils.backupLearningData();
  
  // Configurar servidor
  utils.log('Configurando servidor web...', 'info');
  const { io } = setupServer();
  
  // Iniciar gestor de WhatsApp
  utils.log('Iniciando WhatsApp Bot Manager...', 'info');
  const manager = new WhatsAppManager(io);
  global.whatsappManager = manager; // Hacer global el manager para accederlo desde Socket.IO
  
  // Configurar verificación de salud
  setupHealthCheck(manager);
  
  // Verificar que los datos de aprendizaje se cargaron correctamente
  if (Object.keys(manager.learningDatabase.responses || {}).length > 0) {
    utils.log(`Bot inicializado con ${Object.keys(manager.learningDatabase.responses).length} respuestas configuradas`, 'success');
  } else {
    utils.log('¡ADVERTENCIA! No se encontraron respuestas en la base de datos. Se usarán respuestas por defecto.', 'warning');
    
    // Intentar cargar las respuestas por defecto
    try {
      manager.learningDatabase = JSON.parse(JSON.stringify(config.initialLearningData));
      manager.saveLearningData();
      utils.log('Se han cargado las respuestas por defecto', 'info');
    } catch (error) {
      utils.log(`Error al cargar respuestas por defecto: ${error.message}`, 'error');
    }
  }
  
  // Agregar cuentas configuradas
  utils.log('Configurando cuentas de WhatsApp...', 'info');
  config.whatsapp.accounts.forEach(account => {
    manager.addAccount(account.phoneNumber, account.sessionName);
  });
  
  utils.log('Bot de WhatsApp iniciado con sistema de rotación de cuentas', 'success');
  utils.log(`Visita la página web (http://localhost:${config.server.port}) para escanear los códigos QR`, 'info');
  utils.log(`Para administrar respuestas, visita http://localhost:${config.server.port}/admin`, 'info');
  
  // Configurar manejo de errores no capturados
  process.on('uncaughtException', (error) => {
    utils.log(`Error no capturado: ${error.message}`, 'error');
    console.error(error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    utils.log(`Rechazo de promesa no manejado: ${reason}`, 'error');
    console.error('Promesa rechazada no manejada:', promise);
  });
  
  // Función de limpieza al cerrar
  function cleanup() {
    utils.log('Cerrando aplicación...', 'info');
    
    // Realizar tareas de limpieza antes de salir
    utils.backupLearningData();
    
    // Cerrar todas las conexiones de WhatsApp si es posible
    if (global.whatsappManager && global.whatsappManager.accounts) {
      utils.log('Cerrando conexiones de WhatsApp...', 'info');
      
      global.whatsappManager.accounts.forEach(account => {
        if (account.client) {
          try {
            account.client.destroy();
            utils.log(`Conexión de ${account.phoneNumber} cerrada correctamente`, 'success');
          } catch (error) {
            utils.log(`Error al cerrar conexión de ${account.phoneNumber}: ${error.message}`, 'error');
          }
        }
      });
    }
    
    process.exit(0);
  }
  
  // Capturar señales para cierre limpio
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Ejecutar la aplicación
main().catch(error => {
  utils.log(`Error al iniciar la aplicación: ${error.message}`, 'error');
  console.error(error);
});