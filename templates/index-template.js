// Plantilla para la página principal
const path = require('path');
const fs = require('fs');
const config = require('../config');

function createIndexHtml() {
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Bot Manager</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
  <style>
    body { 
      padding: 20px;
      background-color: #f7f7f7;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .header-container {
      background-color: #075e54;
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .qr-container {
      text-align: center;
      margin: 20px auto;
      padding: 20px;
      border-radius: 10px;
      background-color: white;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      max-width: 500px;
      transition: all 0.3s ease;
    }
    .qr-container.active {
      border: 3px solid #25d366;
      box-shadow: 0 8px 16px rgba(37, 211, 102, 0.2);
    }
    .status-indicator {
      height: 15px;
      width: 15px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 5px;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      margin-left: 10px;
      font-size: 14px;
      font-weight: bold;
    }
    .status-ready {
      background-color: #28a745;
      color: white;
    }
    .status-waiting {
      background-color: #ffc107;
      color: black;
    }
    .status-error {
      background-color: #dc3545;
      color: white;
    }
    .phone-number {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .account-controls {
      margin: 20px 0;
      display: flex;
      justify-content: center;
      gap: 10px;
    }
    .loading-spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      border: 2px solid currentColor;
      border-right-color: transparent;
      animation: spinner-border .75s linear infinite;
    }
    .account-selector {
      margin: 20px auto;
      max-width: 500px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .log-container {
      margin-top: 30px;
      max-height: 200px;
      overflow-y: auto;
      background-color: white;
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .log-entry {
      margin-bottom: 5px;
      padding-bottom: 5px;
      border-bottom: 1px solid #f0f0f0;
    }
    .log-entry:last-child {
      border-bottom: none;
    }
    .progress {
      height: 10px;
      margin: 10px 0;
    }
    @keyframes spinner-border {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-container">
      <h1 class="text-center mb-0"><i class="bi bi-whatsapp me-2"></i>WhatsApp Bot Manager</h1>
    </div>
    
    <!-- Cuenta activa y selector -->
    <div class="account-selector">
      <div>
        <h4>Cuenta actual: <span id="current-account-index">1</span> de <span id="total-accounts">0</span></h4>
      </div>
      <div class="btn-group">
        <button id="prev-account" class="btn btn-outline-primary"><i class="bi bi-chevron-left"></i></button>
        <button id="next-account" class="btn btn-outline-primary"><i class="bi bi-chevron-right"></i></button>
      </div>
    </div>
    
    <!-- Contenedor de QR y estado -->
    <div id="loading-container" class="qr-container">
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p>Inicializando WhatsApp Bot...</p>
      <div class="progress">
        <div id="loading-progress" class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
             role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
    
    <div id="account-container" class="qr-container" style="display: none;">
      <div class="phone-number" id="account-phone">---</div>
      <div id="account-status">
        <span class="status-badge status-waiting">Esperando...</span>
      </div>
      
      <div id="qr-display" class="mt-4">
        <!-- El QR se mostrará aquí -->
      </div>
      
      <div class="account-controls">
        <button id="logout-btn" class="btn btn-danger" disabled>
          <i class="bi bi-power me-1"></i> Cerrar sesión
        </button>
        <button id="add-account-btn" class="btn btn-primary">
          <i class="bi bi-plus-circle me-1"></i> Agregar nueva cuenta
        </button>
      </div>
    </div>
    
    <!-- Log de eventos -->
    <div class="log-container">
      <h5><i class="bi bi-list-ul me-2"></i>Historial de eventos</h5>
      <div id="event-log">
        <!-- Eventos se agregarán aquí -->
        <div class="log-entry text-muted">Esperando eventos...</div>
      </div>
    </div>
    
    <!-- Botón para ir al panel de administración -->
    <div class="text-center mt-4">
      <a href="/admin" class="btn btn-success btn-lg">
        <i class="bi bi-gear-fill me-2"></i>Ir al Panel de Administración
      </a>
    </div>
  </div>
  
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Conectar a Socket.IO
    const socket = io();
    
    // Elementos del DOM
    const loadingContainer = document.getElementById('loading-container');
    const accountContainer = document.getElementById('account-container');
    const qrDisplay = document.getElementById('qr-display');
    const accountPhone = document.getElementById('account-phone');
    const accountStatus = document.getElementById('account-status');
    const eventLog = document.getElementById('event-log');
    const currentAccountIndex = document.getElementById('current-account-index');
    const totalAccounts = document.getElementById('total-accounts');
    const prevAccountBtn = document.getElementById('prev-account');
    const nextAccountBtn = document.getElementById('next-account');
    const logoutBtn = document.getElementById('logout-btn');
    const addAccountBtn = document.getElementById('add-account-btn');
    const loadingProgress = document.getElementById('loading-progress');
    
    // Variables de estado
    let accounts = [];
    let currentAccount = 0;
    let loadingInterval;
    let progressValue = 25;
    
    // Iniciar animación de carga
    loadingInterval = setInterval(() => {
      if (progressValue < 90) {
        progressValue += 5;
        loadingProgress.style.width = progressValue + '%';
        loadingProgress.setAttribute('aria-valuenow', progressValue);
      }
    }, 700);
    
    // Función para mostrar eventos en el log
    function addLogEntry(message, type = 'info') {
      const now = new Date().toLocaleTimeString();
      const icons = {
        info: 'info-circle',
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
      };
      
      const colors = {
        info: 'text-primary',
        success: 'text-success',
        error: 'text-danger',
        warning: 'text-warning'
      };
      
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + colors[type];
      entry.innerHTML = \`
        <i class="bi bi-\${icons[type]} me-1"></i>
        <small>\${now}</small> - \${message}
      \`;
      
      // Remover "Esperando eventos..." si existe
      if (eventLog.querySelector('.text-muted')) {
        eventLog.innerHTML = '';
      }
      
      eventLog.prepend(entry);
      
      // Limitar a 10 entradas
      if (eventLog.children.length > 10) {
        eventLog.removeChild(eventLog.lastChild);
      }
    }
    
    // Función para mostrar la cuenta actual
    function displayAccount(index) {
      if (accounts.length === 0) return;
      
      if (index < 0) index = 0;
      if (index >= accounts.length) index = accounts.length - 1;
      
      currentAccount = index;
      currentAccountIndex.textContent = currentAccount + 1;
      
      const account = accounts[currentAccount];
      accountPhone.textContent = account.phoneNumber || 'Sin número';
      
      // Actualizar botones de navegación
      prevAccountBtn.disabled = currentAccount === 0;
      nextAccountBtn.disabled = currentAccount === accounts.length - 1;
      
      // Actualizar estado
      updateAccountStatus(account);
      
      // Mostrar/ocultar QR según el estado
      if (account.qrData && (account.status === 'waiting' || account.status === 'initializing')) {
        qrDisplay.innerHTML = \`<img src="\${account.qrData}" alt="Código QR" class="img-fluid">\`;
      } else if (account.status === 'ready' || account.status === 'authenticated') {
        qrDisplay.innerHTML = \`
          <div class="alert alert-success">
            <i class="bi bi-check-circle-fill me-2"></i>
            WhatsApp conectado correctamente
          </div>
        \`;
        logoutBtn.disabled = false;
      } else {
        qrDisplay.innerHTML = \`
          <div class="alert alert-warning">
            <i class="bi bi-hourglass-split me-2"></i>
            Esperando código QR...
          </div>
        \`;
        logoutBtn.disabled = true;
      }
    }
    
    // Función para actualizar el estado de la cuenta
    function updateAccountStatus(account) {
      let statusClass, statusText;
      
      switch (account.status) {
        case 'ready':
          statusClass = 'status-ready';
          statusText = 'Conectado';
          break;
        case 'authenticated':
          statusClass = 'status-ready';
          statusText = 'Autenticado';
          break;
        case 'disconnected':
          statusClass = 'status-error';
          statusText = 'Desconectado';
          break;
        case 'initializing':
          statusClass = 'status-waiting';
          statusText = 'Inicializando';
          break;
        default:
          statusClass = 'status-waiting';
          statusText = 'Esperando';
      }
      
      accountStatus.innerHTML = \`<span class="status-badge \${statusClass}">\${statusText}</span>\`;
      
      // Aplicar borde verde si está activa
      if (account.active) {
        accountContainer.classList.add('active');
        accountStatus.innerHTML += ' <span class="badge bg-success ms-2">ACTIVA</span>';
      } else {
        accountContainer.classList.remove('active');
      }
    }
    
    // Eventos Socket.IO
    socket.on('connect', () => {
      addLogEntry('Conectado al servidor', 'success');
      socket.emit('requestStatus');
    });
    
    socket.on('status', (data) => {
      // Si es el primer mensaje de estado, finalizar la carga
      if (loadingContainer.style.display !== 'none') {
        clearInterval(loadingInterval);
        loadingContainer.style.display = 'none';
        accountContainer.style.display = 'block';
      }
      
      // Buscar si la cuenta ya existe en nuestra lista
      const existingIndex = accounts.findIndex(acc => acc.sessionName === data.sessionName);
      
      if (existingIndex >= 0) {
        // Actualizar cuenta existente
        accounts[existingIndex].status = data.status;
        accounts[existingIndex].active = data.active;
        
        // Si estamos mostrando esta cuenta, actualizar la vista
        if (currentAccount === existingIndex) {
          displayAccount(currentAccount);
        }
      } else if (data.sessionName !== 'sistema') {
        // Agregar nueva cuenta (ignorar mensajes del sistema)
        accounts.push({
          sessionName: data.sessionName,
          phoneNumber: data.phoneNumber,
          status: data.status,
          active: data.active,
          qrData: null
        });
        
        totalAccounts.textContent = accounts.length;
        
        // Si es la primera cuenta, mostrarla
        if (accounts.length === 1) {
          displayAccount(0);
        }
      }
      
      // Agregar al log
      if (data.sessionName === 'sistema') {
        addLogEntry(data.message || 'Actualización del sistema', 'info');
      } else {
        addLogEntry(\`\${data.phoneNumber}: \${data.status}\${data.active ? ' (ACTIVA)' : ''}\`, 
                    data.status === 'ready' ? 'success' : 'info');
      }
    });
    
    socket.on('qr', (data) => {
      // Buscar la cuenta correspondiente
      const accountIndex = accounts.findIndex(acc => acc.sessionName === data.sessionName);
      
      if (accountIndex >= 0) {
        // Actualizar los datos de QR
        accounts[accountIndex].qrData = data.qrDataUrl;
        accounts[accountIndex].status = 'waiting';
        
        // Si estamos mostrando esta cuenta, actualizar la vista
        if (currentAccount === accountIndex) {
          displayAccount(currentAccount);
        }
        
        addLogEntry(\`Código QR generado para \${data.phoneNumber}\`, 'info');
      } else {
        // Si la cuenta no existe, agregarla
        accounts.push({
          sessionName: data.sessionName,
          phoneNumber: data.phoneNumber,
          status: 'waiting',
          active: false,
          qrData: data.qrDataUrl
        });
        
        totalAccounts.textContent = accounts.length;
        
        // Si es la primera cuenta, mostrarla
        if (accounts.length === 1) {
          displayAccount(0);
        }
        
        addLogEntry(\`Nueva cuenta: \${data.phoneNumber}\`, 'info');
      }
    });
    
    // Eventos de botones
    prevAccountBtn.addEventListener('click', () => {
      displayAccount(currentAccount - 1);
    });
    
    nextAccountBtn.addEventListener('click', () => {
      displayAccount(currentAccount + 1);
    });
    
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Estás seguro de cerrar la sesión de esta cuenta?')) {
        socket.emit('logoutAccount', accounts[currentAccount].sessionName);
        addLogEntry(\`Cerrando sesión de \${accounts[currentAccount].phoneNumber}\`, 'warning');
        
        // Deshabilitar botón mientras se procesa
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<span class="loading-spinner me-2"></span> Cerrando sesión...';
      }
    });
    
    addAccountBtn.addEventListener('click', () => {
      const phoneNumber = prompt('Ingresa el número de teléfono (con código de país):');
      if (phoneNumber) {
        socket.emit('addAccount', {
          phoneNumber,
          sessionName: 'cuenta_' + Date.now()
        });
        
        addLogEntry(\`Agregando nueva cuenta: \${phoneNumber}\`, 'info');
      }
    });
    
    // Solicitar actualizaciones periódicas
    setInterval(() => {
      socket.emit('requestStatus');
    }, 30000);
  </script>
</body>
</html>
  `;
  
  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public);
  }
  
  // Guardar el HTML
  fs.writeFileSync(path.join(config.paths.public, config.files.indexHtml), htmlContent);
  console.log('Archivo HTML creado correctamente');
}

module.exports = createIndexHtml;