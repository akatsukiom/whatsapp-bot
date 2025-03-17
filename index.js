// index.js - Punto de entrada principal para WhatsApp Bot Manager
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const setupServer = require('./server');
const config = require('./config');

// Cargar variables de entorno
dotenv.config();

// Inicialización
async function main() {
  console.log('Iniciando WhatsApp Bot Manager...');
  
  // Asegurar que existen las carpetas necesarias
  utils.ensureDirectories();
  
  // Crear archivos necesarios si no existen
  const templatesExist = fs.existsSync(path.join(config.paths.public, 'index.html')) && 
                        fs.existsSync(path.join(config.paths.public, 'admin.html'));
                        
  if (!templatesExist) {
    try {
      // Cargar módulos de plantillas
      const createIndexHtml = require('./templates/index-template');
      const createAdminHtml = require('./templates/admin-template');
      
      // Crear archivos HTML
      createIndexHtml();
      createAdminHtml();
      utils.log('Archivos HTML generados correctamente', 'success');
    } catch (error) {
      utils.log(`Error al generar archivos HTML: ${error.message}`, 'error');
    }
  }
  
  // Crear archivo de datos de aprendizaje si no existe
  utils.createLearningDataFile();
  
  // Verificar permisos de archivos
  utils.checkFilePermissions();
  
  // Iniciar el servidor web
  const { app, server, io } = setupServer();
  
  try {
    // Cargar el gestor de WhatsApp
    const WhatsAppManager = require('./modules/whatsapp');
    
    // Inicializar el gestor
    const whatsappManager = new WhatsAppManager(config.whatsapp);
    
    // Guardar en global para acceso desde otros módulos
    global.whatsappManager = whatsappManager;
    
    // Cargar el módulo de IA si está configurado
    if (process.env.OPENAI_API_KEY) {
      global.aiHandler = require('./ai-handler');
      utils.log('Módulo de IA inicializado con API key de OpenAI', 'success');
    } else {
      utils.log('No se encontró API key de OpenAI, las respuestas de IA estarán desactivadas', 'warning');
    }
    
    // Inicializar el gestor de WhatsApp
    await whatsappManager.initialize();
    utils.log('WhatsApp Bot Manager inicializado correctamente', 'success');
    
  } catch (error) {
    utils.log(`Error al inicializar WhatsApp Manager: ${error.message}`, 'error');
    utils.log('El servidor web continuará funcionando sin el módulo de WhatsApp', 'warning');
  }
  
  // Manejar terminación graceful
  setupGracefulShutdown(server);
}

// Configurar manejo de cierre graceful
function setupGracefulShutdown(server) {
  const shutdown = async () => {
    utils.log('Cerrando aplicación...', 'warning');
    
    try {
      // Desconectar WhatsApp si está activo
      if (global.whatsappManager) {
        await global.whatsappManager.logout();
      }
      
      // Cerrar el servidor HTTP
      if (server) {
        server.close();
      }
      
      utils.log('Aplicación cerrada correctamente', 'success');
    } catch (err) {
      utils.log(`Error al cerrar aplicación: ${err.message}`, 'error');
    }
    
    process.exit(0);
  };
  
  // Escuchar eventos de terminación
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('uncaughtException', (err) => {
    utils.log(`Error no manejado: ${err.message}`, 'error');
    utils.log(err.stack, 'error');
    shutdown();
  });
}

// Ejecutar la función principal
main().catch(error => {
  console.error('Error fatal al iniciar la aplicación:', error);
  process.exit(1);
});