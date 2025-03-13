// Plantilla para la página principal
const path = require('path');
const fs = require('fs');
const config = require('../config');

function createIndexHtml() {
  const htmlContent = `<!DOCTYPE html>
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
      margin: 20px 0;
      padding: 20px;
      border-radius: 10px;
      background-color: white;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
    .status-ready {
      background-color: #28a745;
    }
    .status-waiting {
      background-color: #ffc107;
    }
    .status-error {
      background-color: #dc3545;
    }
    .active-badge {
      background-color: #25d366;
      color: white;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    #loading-container {
      text-align: center;
      background-color: white;
      border-radius: 10px;
      padding: 30px;
      margin: 50px auto;
      max-width: 500px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .spinner-container {
      margin-bottom: 20px;
    }
    .progress {
      height: 10px;
      margin: 20px 0;
    }
    #status-container {
      background-color: white;
      border-radius: 10px;
      padding: 15px;
      margin-top: 20px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      max-height: 300px;
      overflow-y: auto;
    }
    .status-entry {
      border-bottom: 1px solid #f0f0f0;
      padding: 8px 0;
    }
    .status-entry:last-child {
      border-bottom: none;
    }
    .admin-button {
      margin-top: 20px;
      padding: 10px 20px;
      font-size: 16px;
      background-color: #075e54;
      border-color: #075e54;
    }
    .admin-button:hover {
      background-color: #054c44;
      border-color: #054c44;
    }
    .phone-number {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 5px;
    }
    .connection-stats {
      background-color: #f8f9fa;
      border-radius: 10px;
      padding: 15px;
      margin-top: 30px;
      margin-bottom: 20px;
    }
    .connection-title {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .connection-title i {
      margin-right: 10px;
      color: #075e54;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Pantalla de carga inicial -->
    <div id="loading-container">
      <h2 class="mb-4">Inicializando WhatsApp Bot Manager</h2>
      <div class="spinner-container">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>
      <p id="loading-message">Preparando conexiones de WhatsApp...</p>
      <div class="progress">
        <div id="loading-progress" class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <p class="text-muted"><small>Este proceso puede tardar hasta 30 segundos</small></p>
    </div>

    <!-- Contenido principal (oculto inicialmente) -->
    <div id="main-content" style="display: none;">
      <div class="header-container">
        <h1 class="text-center mb-0"><i class="bi bi-whatsapp me-2"></i>WhatsApp Bot Manager</h1>
      </div>
      
      <div class="connection-stats">
        <div class="connection-title">
          <i class="bi bi-graph-up-arrow fs-4"></i>
          <h3 class="mb-0">Resumen de conexiones</h3>
        </div>
        <div class="row">
          <div class="col-md-4">
            <div class="card text-center mb-3">
              <div class="card-body">
                <h5 class="card-title">Total de cuentas</h5>
                <p class="card-text fs-1" id="total-accounts">0</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center mb-3">
              <div class="card-body">
                <h5 class="card-title">Cuentas conectadas</h5>
                <p class="card-text fs-1" id="connected-accounts">0</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center mb-3">
              <div class="card-body">
                <h5 class="card-title">Cuenta activa</h5>
                <p class="card-text fs-1" id="active-account">-</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row" id="accounts-container">
        <!-- Las cuentas se agregarán aquí dinámicamente -->
      </div>
      
      <div id="no-connections" class="alert alert-warning mt-4" style="display: none;">
        <i class="bi bi-exclamation-triangle-fill me-2"></i> No hay conexiones activas. Espera mientras se inicializa el sistema o revisa los logs del servidor.
      </div>
      
      <div class="connection-title mt-4">
        <i class="bi bi-journal-text fs-4"></i>
        <h3>Historial de eventos</h3>
      </div>
      <div id="status-container">
        <p class="text-muted text-center">Esperando información de estado...</p>
      </div>
      
      <div class="row mt-4">
        <div class="col-12 text-center">
          <a href="/admin" class="btn btn-primary btn-lg admin-button">
            <i class="bi bi-gear-fill me-2"></i>Ir al Panel de Administración
          </a>
        </div>
      </div>
    </div>
  </div>
  
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const loadingContainer = document.getElementById('loading-container');
    const mainContent = document.getElementById('main-content');
    const accountsContainer = document.getElementById('accounts-container');
    const statusContainer = document.getElementById('status-container');
    const noConnectionsDiv = document.getElementById('no-connections');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingMessage = document.getElementById('loading-message');
    const totalAccountsEl = document.getElementById('total-accounts');
    const connectedAccountsEl = document.getElementById('connected-accounts');
    const activeAccountEl = document.getElementById('active-account');
    
    let connectionCount = 0;
    let connectionProgress = 25;
    let accounts = {};
    let progressInterval;
    
    // Función para actualizar el contador de progreso
    function startProgressAnimation() {
      progressInterval = setInterval(() => {
        if (connectionProgress < 90) {
          connectionProgress += 5;
          loadingProgress.style.width = connectionProgress + '%';
          loadingProgress.setAttribute('aria-valuenow', connectionProgress);
          
          // Actualizar mensaje según el progreso
          if (connectionProgress > 40 && connectionProgress < 60) {
            loadingMessage.textContent = 'Inicializando el navegador...';
          } else if (connectionProgress >= 60 && connectionProgress < 75) {
            loadingMessage.textContent = 'Conectando con WhatsApp...';
          } else if (connectionProgress >= 75) {
            loadingMessage.textContent = 'Generando códigos QR...';
          }
        }
      }, 700);
    }
    
    // Completar la carga cuando tengamos datos reales
    function completeLoading() {
      clearInterval(progressInterval);
      connectionProgress = 100;
      loadingProgress.style.width = '100%';
      loadingProgress.setAttribute('aria-valuenow', 100);
      
      setTimeout(() => {
        loadingContainer.style.display = 'none';
        mainContent.style.display = 'block';
      }, 500);
    }
    
    // Actualizar estadísticas de conexión
    function updateConnectionStats() {
      const accountList = Object.values(accounts);
      totalAccountsEl.textContent = accountList.length;
      
      const connectedAccounts = accountList.filter(acc => 
        acc.status === 'ready' || acc.status === 'authenticated'
      ).length;
      connectedAccountsEl.textContent = connectedAccounts;
      
      const activeAccount = accountList.find(acc => acc.active);
      if (activeAccount) {
        activeAccountEl.textContent = activeAccount.phoneNumber.substring(0, 5) + '...';
      } else {
        activeAccountEl.textContent = '-';
      }
    }
    
    // Iniciar animación de progreso
    startProgressAnimation();
    
    // Solicitar estado actual al cargar la página
    socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
      socket.emit('requestStatus');
      
      // Si no hay respuesta después de 10 segundos, mostrar mensaje
      setTimeout(() => {
        if (connectionCount === 0) {
          completeLoading();
          noConnectionsDiv.style.display = 'block';
          statusContainer.innerHTML = '<p class="text-danger text-center"><i class="bi bi-exclamation-circle me-2"></i>No se ha recibido información de estado. Revisa los logs del servidor.</p>';
        }
      }, 10000);
    });
    
    // Manejar códigos QR
    socket.on('qr', (data) => {
      console.log('QR recibido para:', data.sessionName);
      connectionCount++;
      
      // Completar carga si es el primer QR
      if (connectionCount === 1) {
        completeLoading();
      }
      
      noConnectionsDiv.style.display = 'none';
      
      // Almacenar información de la cuenta
      if (!accounts[data.sessionName]) {
        accounts[data.sessionName] = {
          phoneNumber: data.phoneNumber,
          status: 'waiting',
          active: false
        };
      }
      
      // Buscar si ya existe un contenedor para esta cuenta
      let accountElement = document.getElementById('account-' + data.sessionName);
      
      if (!accountElement) {
        // Crear nuevo contenedor si no existe
        accountElement = document.createElement('div');
        accountElement.id = 'account-' + data.sessionName;
        accountElement.className = 'col-md-6 mb-4';
        accountElement.innerHTML = \`
          <div class="qr-container \${accounts[data.sessionName].active ? 'active' : ''}">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="phone-number">
                \${data.phoneNumber || data.sessionName}
                \${accounts[data.sessionName].active ? '<span class="active-badge">ACTIVA</span>' : ''}
              </div>
            </div>
            <div id="status-\${data.sessionName}" class="mb-3">
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
        
        // Actualizar badge de activo
        const container = accountElement.querySelector('.qr-container');
        const phoneNumberEl = accountElement.querySelector('.phone-number');
        
        if (accounts[data.sessionName].active) {
          container.classList.add('active');
          if (!phoneNumberEl.querySelector('.active-badge')) {
            phoneNumberEl.innerHTML += '<span class="active-badge">ACTIVA</span>';
          }
        } else {
          container.classList.remove('active');
          const badge = phoneNumberEl.querySelector('.active-badge');
          if (badge) {
            badge.remove();
          }
        }
      }
      
      updateConnectionStats();
    });
    
    // Manejar actualizaciones de estado
    socket.on('status', (data) => {
      console.log('Estado actualizado:', data);
      connectionCount++;
      
      // Completar carga si es el primer estado
      if (connectionCount === 1) {
        completeLoading();
      }
      
      noConnectionsDiv.style.display = 'none';
      
      // Actualizar en nuestro registro de cuentas
      if (!accounts[data.sessionName]) {
        accounts[data.sessionName] = {
          phoneNumber: data.phoneNumber,
          status: data.status,
          active: data.active || false
        };
      } else {
        accounts[data.sessionName].status = data.status;
        accounts[data.sessionName].active = data.active || false;
      }
      
      // Buscar si ya existe un contenedor para esta cuenta
      let accountElement = document.getElementById('account-' + data.sessionName);
      
      if (!accountElement && (data.status === 'ready' || data.status === 'authenticated' || data.status === 'initializing')) {
        // Crear nuevo contenedor si no existe
        accountElement = document.createElement('div');
        accountElement.id = 'account-' + data.sessionName;
        accountElement.className = 'col-md-6 mb-4';
        accountElement.innerHTML = \`
          <div class="qr-container \${data.active ? 'active' : ''}">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="phone-number">
                \${data.phoneNumber || data.sessionName}
                \${data.active ? '<span class="active-badge">ACTIVA</span>' : ''}
              </div>
            </div>
            <div id="status-\${data.sessionName}" class="mb-3">
              <span class="status-indicator status-waiting"></span>
              <span class="status-text">Inicializando...</span>
            </div>
            <div id="qr-\${data.sessionName}" class="mt-3">
              <p>Esperando información de conexión...</p>
            </div>
          </div>
        \`;
        accountsContainer.appendChild(accountElement);
      }
      
      // Actualizar el estado si existe el elemento
      if (accountElement) {
        const statusElement = document.getElementById('status-' + data.sessionName);
        const container = accountElement.querySelector('.qr-container');
        const phoneNumberEl = accountElement.querySelector('.phone-number');
        
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
                qrElement.innerHTML = '<p class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i>WhatsApp conectado correctamente</p>';
              }
              break;
            case 'authenticated':
              statusClass = 'status-ready';
              statusText = 'Autenticado';
              break;
            case 'initializing':
              statusClass = 'status-waiting';
              statusText = 'Inicializando';
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
        
        // Actualizar si es activa
        if (data.active) {
          container.classList.add('active');
          if (!phoneNumberEl.querySelector('.active-badge')) {
            phoneNumberEl.innerHTML = \`
              \${data.phoneNumber || data.sessionName}
              <span class="active-badge">ACTIVA</span>
            \`;
          }
        } else {
          container.classList.remove('active');
          const badge = phoneNumberEl.querySelector('.active-badge');
          if (badge) {
            badge.remove();
          }
          phoneNumberEl.textContent = data.phoneNumber || data.sessionName;
        }
      }
      
      // Actualizar contenedor de estado general
      const now = new Date().toLocaleTimeString();
      let statusClass = 'text-secondary';
      let icon = 'info-circle';
      
      if (data.status === 'ready' || data.status === 'authenticated') {
        statusClass = 'text-success';
        icon = 'check-circle';
      } else if (data.status === 'disconnected') {
        statusClass = 'text-danger';
        icon = 'x-circle';
      } else {
        statusClass = 'text-warning';
        icon = 'exclamation-circle';
      }
      
      const statusUpdate = document.createElement('div');
      statusUpdate.className = 'status-entry';
      statusUpdate.innerHTML = \`
        <p class="\${statusClass}">
          <i class="bi bi-\${icon}-fill me-2"></i>
          <small>\${now}</small> - <strong>\${data.phoneNumber || data.sessionName}</strong>: 
          \${data.status}\${data.active ? ' <span class="badge bg-success">ACTIVA</span>' : ''}
        </p>
      \`;
      
      // Limpiar el mensaje de "Esperando información" si es la primera actualización
      if (statusContainer.querySelector('.text-muted')) {
        statusContainer.innerHTML = '';
      }
      
      statusContainer.prepend(statusUpdate);
      
      // Limitar a 10 mensajes de estado
      if (statusContainer.children.length > 10) {
        statusContainer.removeChild(statusContainer.lastChild);
      }
      
      updateConnectionStats();
    });
    
    // Actualizar estado cada 30 segundos
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