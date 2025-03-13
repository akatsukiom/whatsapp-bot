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
  
  // Crear archivos necesarios
  createIndexHtml();
  createAdminHtml();
  utils.createLearningDataFile();
  
  // Configurar servidor
  utils.log('Configurando servidor web...', 'info');
  const { io } = setupServer();
  
  // Iniciar gestor de WhatsApp
  utils.log('Iniciando WhatsApp Bot Manager...', 'info');
  const manager = new WhatsAppManager(io);
  global.whatsappManager = manager; // Hacer global el manager para accederlo desde Socket.IO
  
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