// Bot de WhatsApp con sistema de respuesta automática, rotación de números y servidor web para QR
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Configuración para el manejo de múltiples cuentas
class WhatsAppManager {
  constructor(io) {
    this.accounts = [];
    this.activeAccount = null;
    this.io = io; // Socket.io para enviar QR al cliente
    this.learningDatabase = {
      responses: {},
      mediaHandlers: {}
    };
    
    // Cargar datos de aprendizaje si existen
    this.loadLearningData();
  }
  
  // Cargar datos de aprendizaje previos
  loadLearningData() {
    try {
      const data = fs.readFileSync('learning-data.json', 'utf8');
      this.learningDatabase = JSON.parse(data);
      console.log('Datos de aprendizaje cargados correctamente');
    } catch (err) {
      console.log('No se encontraron datos de aprendizaje previos, creando nueva base de datos');
      this.saveLearningData();
    }
  }
  
  // Guardar datos de aprendizaje
  saveLearningData() {
    fs.writeFileSync('learning-data.json', JSON.stringify(this.learningDatabase, null, 2));
    console.log('Datos de aprendizaje guardados correctamente');
  }
  
  // Agregar una nueva cuenta
  addAccount(phoneNumber, sessionName) {
    const sessionFolder = `./sessions/${sessionName}`;
    
    // Crear cliente de WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: sessionName }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });
    
    // Configurar eventos
    client.on('qr', (qr) => {
      console.log(`QR Code generado para la cuenta ${phoneNumber}`);
      
      // Convertir QR a imagen y enviarlo al cliente web
      qrcode.toDataURL(qr, (err, url) => {
        if (err) {
          console.error('Error al generar QR:', err);
          return;
        }
        
        // Emitir el código QR a través de socket.io
        this.io.emit('qr', {
          sessionName,
          phoneNumber,
          qrDataUrl: url
        });
        
        // También guardar el QR como archivo
        qrcode.toFile(`./public/qr-${sessionName}.png`, qr, {
          type: 'png',
          margin: 2,
        }, (err) => {
          if (err) console.error('Error al guardar QR como archivo:', err);
          else console.log(`QR guardado como qr-${sessionName}.png`);
        });
      });
    });
    
    client.on('ready', () => {
      console.log(`Cliente ${phoneNumber} está listo!`);
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'ready'
      });
    });
    
    client.on('authenticated', () => {
      console.log(`Cliente ${phoneNumber} autenticado correctamente`);
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'authenticated'
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
      console.log(`Cliente ${phoneNumber} desconectado:`, reason);
      this.io.emit('status', {
        sessionName,
        phoneNumber,
        status: 'disconnected',
        reason
      });
      
      // Si se desconecta por baneo, cambiamos de cuenta
      if (reason.includes('banned') || reason.includes('timeout')) {
        console.log(`La cuenta ${phoneNumber} parece estar baneada, cambiando a otra cuenta...`);
        this.switchToNextAccount();
      }
      
      // Reiniciar el cliente después de la desconexión
      client.initialize().catch(err => {
        console.error(`Error al reinicializar cliente ${phoneNumber}:`, err);
      });
    });
    
    // Inicializamos el cliente
    client.initialize().catch(err => {
      console.error(`Error al inicializar cliente ${phoneNumber}:`, err);
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
    
    return this.accounts.length - 1; // Devolvemos el índice de la cuenta
  }
  
  // Verificar si un mensaje es de un administrador
  isAdminMessage(message) {
    // Lista de números de administradores que pueden controlar el bot
    const adminNumbers = ['52xxxxxxxxxx@c.us']; // Reemplazar con tu número
    return adminNumbers.includes(message.from) && message.body.startsWith('!');
  }
  
  // Manejar comandos de administración
  async handleAdminCommand(message, client) {
    const command = message.body.split(' ')[0].toLowerCase();
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
        const response = parts[1].trim();
        
        this.learningDatabase.responses[trigger] = response;
        this.saveLearningData();
        
        client.sendMessage(message.from, `Aprendido: "${trigger}" -> "${response}"`);
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
        client.sendMessage(message.from, statusMsg);
        break;
        
      default:
        client.sendMessage(message.from, 'Comando desconocido. Comandos disponibles: !switch, !learn, !status');
    }
  }
  
  // Manejar mensajes entrantes
  async handleIncomingMessage(message, client) {
    console.log(`Mensaje recibido: ${message.body}`);
    
    // Si es un mensaje multimedia
    if (message.hasMedia) {
      await this.handleMediaMessage(message, client);
      return;
    }
    
    // Buscar respuesta en la base de datos de aprendizaje
    const messageText = message.body.toLowerCase();
    let response = null;
    
    // Buscar coincidencia exacta
    if (this.learningDatabase.responses[messageText]) {
      response = this.learningDatabase.responses[messageText];
    } else {
      // Buscar coincidencia parcial
      for (const key in this.learningDatabase.responses) {
        if (messageText.includes(key)) {
          response = this.learningDatabase.responses[key];
          break;
        }
      }
    }
    
    // Si encontramos una respuesta, la enviamos
    if (response) {
      client.sendMessage(message.from, response);
    }
  }
  
  // Manejar mensajes multimedia
  async handleMediaMessage(message, client) {
    try {
      const media = await message.downloadMedia();
      
      // Por defecto, simplemente confirmamos la recepción del archivo
      const response = "He recibido tu archivo multimedia. ¿En qué puedo ayudarte?";
      client.sendMessage(message.from, response);
      
      // Aquí se podría implementar un análisis más sofisticado de los archivos
      // Por ejemplo, usando OCR para imágenes, o transcripción para audio
    } catch (error) {
      console.error('Error al manejar mensaje multimedia:', error);
      client.sendMessage(message.from, "Lo siento, no pude procesar ese archivo multimedia.");
    }
  }
  
  // Cambiar a una cuenta específica
  switchToAccount(index) {
    if (index < 0 || index >= this.accounts.length) {
      console.error('Índice de cuenta inválido');
      return false;
    }
    
    // Desactivar la cuenta actual
    if (this.activeAccount) {
      this.activeAccount.active = false;
    }
    
    // Activar la nueva cuenta
    this.accounts[index].active = true;
    this.activeAccount = this.accounts[index];
    
    console.log(`Cambiado a la cuenta ${this.activeAccount.phoneNumber}`);
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
    
    console.error('No hay cuentas disponibles sin baneo');
    return false;
  }
}

// Configuración del servidor Express
function setupServer() {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);
  
  // Servir archivos estáticos
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Crear carpeta public si no existe
  if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
  }
  
  // Ruta principal
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
  
  // Puerto para Railway o local
  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, () => {
    console.log(`Servidor web iniciado en el puerto ${PORT}`);
  });
  
  return { app, server, io };
}

// Crear archivo HTML para la interfaz web
function createHtmlFile() {
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Bot Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
      body { 
        padding: 20px;
        background-color: #f7f7f7;
      }
      .qr-container {
        text-align: center;
        margin: 20px 0;
        padding: 20px;
        border-radius: 10px;
        background-color: white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
      .status-indicator {
        height: 15px;
        width: 15px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 5px;
      }
      .status-ready {
        background-color: #28a745;
      }
      .status-waiting {
        background-color: #ffc107;
      }
      .status-error {
        background-color: #dc3545;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="mb-4 text-center">WhatsApp Bot Manager</h1>
      
      <div class="row" id="accounts-container">
        <!-- Las cuentas se agregarán aquí dinámicamente -->
      </div>
      
      <div class="mt-4">
        <h3>Estado de las conexiones:</h3>
        <div id="status-container">
          <!-- El estado se actualizará aquí -->
        </div>
      </div>
    </div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      const accountsContainer = document.getElementById('accounts-container');
      const statusContainer = document.getElementById('status-container');
      
      // Manejar códigos QR
      socket.on('qr', (data) => {
        console.log('QR recibido para:', data.sessionName);
        
        // Buscar si ya existe un contenedor para esta cuenta
        let accountElement = document.getElementById('account-' + data.sessionName);
        
        if (!accountElement) {
          // Crear nuevo contenedor si no existe
          accountElement = document.createElement('div');
          accountElement.id = 'account-' + data.sessionName;
          accountElement.className = 'col-md-6 mb-4';
          accountElement.innerHTML = \`
            <div class="qr-container">
              <h3>\${data.phoneNumber || data.sessionName}</h3>
              <div id="status-\${data.sessionName}">
                <span class="status-indicator status-waiting"></span>
                <span class="status-text">Esperando escaneo...</span>
              </div>
              <div id="qr-\${data.sessionName}" class="mt-3">
                <img src="\${data.qrDataUrl}" alt="Código QR" class="img-fluid">
              </div>
            </div>
          \`;
          accountsContainer.appendChild(accountElement);
        } else {
          // Actualizar QR existente
          const qrElement = document.getElementById('qr-' + data.sessionName);
          qrElement.innerHTML = \`<img src="\${data.qrDataUrl}" alt="Código QR" class="img-fluid">\`;
          
          // Actualizar estado
          const statusElement = document.getElementById('status-' + data.sessionName);
          statusElement.innerHTML = \`
            <span class="status-indicator status-waiting"></span>
            <span class="status-text">Esperando escaneo...</span>
          \`;
        }
      });
      
      // Manejar actualizaciones de estado
      socket.on('status', (data) => {
        console.log('Estado actualizado:', data);
        
        const statusElement = document.getElementById('status-' + data.sessionName);
        if (statusElement) {
          let statusClass = 'status-waiting';
          let statusText = 'Desconocido';
          
          switch (data.status) {
            case 'ready':
              statusClass = 'status-ready';
              statusText = 'Conectado';
              // Ocultar QR cuando esté listo
              const qrElement = document.getElementById('qr-' + data.sessionName);
              if (qrElement) {
                qrElement.innerHTML = '<p class="alert alert-success">WhatsApp conectado correctamente</p>';
              }
              break;
            case 'authenticated':
              statusClass = 'status-ready';
              statusText = 'Autenticado';
              break;
            case 'disconnected':
              statusClass = 'status-error';
              statusText = 'Desconectado: ' + (data.reason || 'razón desconocida');
              break;
            default:
              statusClass = 'status-waiting';
              statusText = data.status;
          }
          
          statusElement.innerHTML = \`
            <span class="status-indicator \${statusClass}"></span>
            <span class="status-text">\${statusText}</span>
          \`;
        }
        
        // Actualizar contenedor de estado general
        const now = new Date().toLocaleTimeString();
        const statusUpdate = document.createElement('div');
        statusUpdate.innerHTML = \`
          <p><small>\${now}</small> - <strong>\${data.phoneNumber || data.sessionName}</strong>: \${data.status}</p>
        \`;
        statusContainer.prepend(statusUpdate);
        
        // Limitar a 10 mensajes de estado
        if (statusContainer.children.length > 10) {
          statusContainer.removeChild(statusContainer.lastChild);
        }
      });
    </script>
  </body>
  </html>
  `;
  
  // Crear carpeta public si no existe
  if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
  }
  
  // Guardar el HTML
  fs.writeFileSync('./public/index.html', htmlContent);
  console.log('Archivo HTML creado correctamente');
}

// Crear el archivo learning-data.json inicial
function createLearningDataFile() {
  const initialData = {
    "responses": {
      "hola": "¡Hola! ¿En qué puedo ayudarte?",
      "buenos días": "¡Buenos días! ¿En qué puedo asistirte hoy?",
      "gracias": "De nada, estoy aquí para ayudarte."
    },
    "mediaHandlers": {}
  };
  
  fs.writeFileSync('./learning-data.json', JSON.stringify(initialData, null, 2));
  console.log('Archivo learning-data.json creado correctamente');
}

// Ejemplo de uso
async function main() {
  // Crear archivos necesarios
  createHtmlFile();
  createLearningDataFile();
  
  // Configurar servidor
  const { io } = setupServer();
  
  // Iniciar gestor de WhatsApp
  const manager = new WhatsAppManager(io);
  
  // Agregar algunas cuentas (reemplaza con tus números)
  manager.addAccount('5212345678901', 'cuenta_principal');
  manager.addAccount('5209876543210', 'cuenta_respaldo');
  
  console.log('Bot de WhatsApp iniciado con sistema de rotación de cuentas');
  console.log('Visita la página web para escanear los códigos QR');
}

// Ejecutar la aplicación
main().catch(console.error);