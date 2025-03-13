// Punto de entrada principal para el WhatsApp Bot Manager
const config = require('./config');
const setupServer = require('./server');
const WhatsAppManager = require('./whatsapp-manager');
const createIndexHtml = require('./templates/index-template');
const createAdminHtml = require('./templates/admin-template');
const utils = require('./utils');

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
}

// Ejecutar la aplicación
main().catch(error => {
  utils.log(`Error al iniciar la aplicación: ${error.message}`, 'error');
  console.error(error);
});
