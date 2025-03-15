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
    .connection-alert {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      min-width: 300px;
      display: none;
    }
    @keyframes spinner-border {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- Alerta de conexión -->
  <div id="connection-alert" class="connection-alert alert alert-danger">
    <i class="bi bi-wifi-off me-2"></i> Se ha perdido la conexión con el servidor. Intentando reconectar...
  </div>

  <div class="container">
    <div class="header-container">
      <h1 class="text-center mb-0"><i class="bi bi-whatsapp me-2"></i>WhatsApp Bot Manager</h1>
      <div class="text-center mt-2">
        <span id="connection-status" class="badge bg-secondary">
          <i class="bi bi-wifi me-1"></i> Conectando...
        </span>
      </div>
    </div>
    
    <!-- Pantalla de carga inicial -->
    <div id="loading-container" class="qr-container">
      <h3 class="mb-4">Inicializando WhatsApp Bot</h3>
      <div class="spinner-border text-success mb-3" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p id="loading-message">Preparando conexión de WhatsApp...</p>
      <div class="progress">
        <div id="loading-progress" class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
             role="progressbar" style="width: 25%" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
    </div>
    
    <!-- Contenedor de la cuenta -->
    <div id="account-container" class="qr-container" style="display: none;">
      <div class="phone-number" id="account-phone">---</div>
      <div id="account-status">
        <span class="status-badge status-waiting">Esperando...</span>
      </div>
      
      <!-- Barra de progreso -->
      <div class="progress mt-3">
        <div id="connection-progress" class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
             role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <p id="status-detail" class="text-muted mt-2">Inicializando...</p>
      
      <div id="qr-display" class="mt-4">
        <!-- El QR se mostrará aquí -->
      </div>
      
      <div class="account-controls">
        <button id="logout-btn" class="btn btn-danger" disabled>
          <i class="bi bi-power me-1"></i> Cerrar sesión
        </button>
        <button id="refresh-qr-btn" class="btn btn-warning">
          <i class="bi bi-arrow-repeat me-1"></i> Generar nuevo QR
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
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Conectar a Socket.IO con opciones de reconexión mejoradas
    const socket = io({
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    
    // Elementos del DOM
    const connectionAlert = document.getElementById('connection-alert');
    const connectionStatus = document.getElementById('connection-status');
    const loadingContainer = document.getElementById('loading-container');
    const accountContainer = document.getElementById('account-container');
    const qrDisplay = document.getElementById('qr-display');
    const accountPhone = document.getElementById('account-phone');
    const accountStatus = document.getElementById('account-status');
    const connectionProgress = document.getElementById('connection-progress');
    const statusDetail = document.getElementById('status-detail');
    const eventLog = document.getElementById('event-log');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingMessage = document.getElementById('loading-message');
    const logoutBtn = document.getElementById('logout-btn');
    const refreshQrBtn = document.getElementById('refresh-qr-btn');
    
    // Variables de estado
    let loadingInterval;
    let progressValue = 25;
    let lastHeartbeat = Date.now();
    let connectionActive = false;
    let connectionCheckInterval;
    let isRefreshingQR = false;
    
    // Iniciar animación de carga
    loadingInterval = setInterval(() => {
      if (progressValue < 90) {
        progressValue += 5;
        loadingProgress.style.width = progressValue + '%';
        loadingProgress.setAttribute('aria-valuenow', progressValue);
        
        // Actualizar mensaje según progreso
        if (progressValue > 40 && progressValue < 60) {
          loadingMessage.textContent = 'Inicializando el navegador...';
        } else if (progressValue >= 60 && progressValue < 75) {
          loadingMessage.textContent = 'Conectando con WhatsApp...';
        } else if (progressValue >= 75) {
          loadingMessage.textContent = 'Generando código QR...';
        }
      }
    }, 700);
    
    // Verificar estado de la conexión periódicamente
    connectionCheckInterval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - lastHeartbeat) / 1000;
      
      if (elapsedSeconds > 10 && connectionActive) {
        connectionActive = false;
        connectionStatus.className = 'badge bg-danger';
        connectionStatus.innerHTML = '<i class="bi bi-wifi-off me-1"></i> Desconectado';
        connectionAlert.style.display = 'block';
        addLogEntry('Se ha perdido la conexión con el servidor', 'error');
      }
    }, 5000);
    
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
      entry.innerHTML = '<i class="bi bi-' + icons[type] + ' me-1"></i>' +
                        '<small>' + now + '</small> - ' + message;
      
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
    
    // Función para cerrar sesión
    function logoutAccount() {
      if (confirm('¿Estás seguro de cerrar la sesión? Se eliminarán los datos de sesión y tendrás que escanear un nuevo código QR.')) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cerrando...';
        
        socket.emit('logoutAccount', 'cuenta_principal');
        addLogEntry('Solicitando cierre de sesión...', 'warning');
      }
    }
    
    // Función para refrescar el QR
    function refreshQR() {
      if (isRefreshingQR) return;
      
      if (confirm('¿Estás seguro de generar un nuevo código QR? Esto cerrará la sesión actual si está activa.')) {
        isRefreshingQR = true;
        refreshQrBtn.disabled = true;
        refreshQrBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generando...';
        
        // Actualizar estado visual durante la espera
        accountStatus.innerHTML = '<span class="status-badge status-waiting">Generando QR...</span>';
        connectionProgress.style.width = '30%';
        connectionProgress.setAttribute('aria-valuenow', 30);
        statusDetail.textContent = 'Generando nuevo código QR...';
        
        // Mostrar animación de carga en el área del QR
        qrDisplay.innerHTML = '<div class="spinner-border text-primary my-4" role="status"><span class="visually-hidden">Cargando...</span></div><p>Generando nuevo código QR...</p>';
        
        socket.emit('refreshQR', 'cuenta_principal');
        addLogEntry('Solicitando nuevo código QR...', 'info');
        
        // Establecer un timeout para restablecer botones si no hay respuesta
        setTimeout(() => {
          if (isRefreshingQR) {
            isRefreshingQR = false;
            refreshQrBtn.disabled = false;
            refreshQrBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Generar nuevo QR';
            addLogEntry('Timeout al generar QR, intenta nuevamente', 'warning');
          }
        }, 30000);
      }
    }
    
    // Eventos Socket.IO
    socket.on('connect', () => {
      connectionActive = true;
      connectionStatus.className = 'badge bg-success';
      connectionStatus.innerHTML = '<i class="bi bi-wifi me-1"></i> Conectado';
      connectionAlert.style.display = 'none';
      
      addLogEntry('Conectado al servidor', 'success');
      socket.emit('requestStatus');
    });
    
    socket.on('disconnect', () => {
      connectionActive = false;
      connectionStatus.className = 'badge bg-danger';
      connectionStatus.innerHTML = '<i class="bi bi-wifi-off me-1"></i> Desconectado';
      connectionAlert.style.display = 'block';
      addLogEntry('Se ha perdido la conexión con el servidor', 'error');
    });
    
    // Latidos para verificar la conexión
    socket.on('heartbeat', (data) => {
      lastHeartbeat = data.timestamp;
      
      if (!connectionActive) {
        connectionActive = true;
        connectionStatus.className = 'badge bg-success';
        connectionStatus.innerHTML = '<i class="bi bi-wifi me-1"></i> Conectado';
        connectionAlert.style.display = 'none';
        addLogEntry('Conexión con el servidor restablecida', 'success');
      }
    });
    
    // Recibir mensaje de estado
    socket.on('status', (data) => {
      // Finalizar carga inicial si es el primer mensaje
      if (loadingContainer.style.display !== 'none') {
        clearInterval(loadingInterval);
        loadingContainer.style.display = 'none';
        accountContainer.style.display = 'block';
      }
      
      // Actualizar información de la cuenta
      accountPhone.textContent = data.phoneNumber || 'Sin número';
      
      // Actualizar barra de progreso
      if (data.progress !== undefined) {
        connectionProgress.style.width = data.progress + '%';
        connectionProgress.setAttribute('aria-valuenow', data.progress);
      }
      
      // Actualizar detalle del estado
      if (data.detail) {
        statusDetail.textContent = data.detail;
      }
      
      // Actualizar badge de estado
      let badgeClass = 'status-waiting';
      let statusText = 'Esperando';
      
      switch (data.status) {
        case 'ready':
          badgeClass = 'status-ready';
          statusText = 'Conectado';
          logoutBtn.disabled = false;
          // Corregido aquí: evitar el uso de backticks dentro del script
          addLogEntry('WhatsApp conectado exitosamente: ' + data.phoneNumber, 'success');
          break;
        case 'authenticated':
          badgeClass = 'status-ready';
          statusText = 'Autenticado';
          logoutBtn.disabled = false;
          break;
        case 'waiting':
          badgeClass = 'status-waiting';
          statusText = 'Esperando QR';
          logoutBtn.disabled = true;
          break;
        case 'initializing':
          badgeClass = 'status-waiting';
          statusText = 'Inicializando';
          logoutBtn.disabled = true;
          break;
        case 'disconnected':
          badgeClass = 'status-error';
          statusText = 'Desconectado';
          logoutBtn.disabled = true;
          break;
        case 'error':
          badgeClass = 'status-error';
          statusText = 'Error';
          logoutBtn.disabled = true;
          break;
      }
      
      accountStatus.innerHTML = '<span class="status-badge ' + badgeClass + '">' + statusText + '</span>';
      
      // Agregar al log si es un cambio de estado importante
      if (data.status === 'ready' || data.status === 'authenticated' || data.status === 'error' || data.status === 'disconnected') {
        addLogEntry('Estado: ' + statusText + (data.detail ? ' - ' + data.detail : ''), 
                    data.status === 'ready' || data.status === 'authenticated' ? 'success' : 
                    data.status === 'error' ? 'error' : 'warning');
      }
    });
    
    // Escuchar evento para redirigir al panel de administración
    socket.on('redirectToAdmin', (data) => {
      if (data.isConnected) {
        console.log('WhatsApp conectado correctamente. Redirigiendo al panel de administración...');
        // Mostrar notificación
        addLogEntry('WhatsApp conectado. Redirigiendo al panel de administración...', 'success');
        // Esperar 2 segundos antes de redirigir para que el usuario pueda ver el mensaje
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      }
    });
    
    // Recibir código QR
    socket.on('qr', (data) => {
      // Actualizar QR en la interfaz
      qrDisplay.innerHTML = '<img src="' + data.qrDataUrl + '" alt="Código QR" class="img-fluid">';
      
      // Actualizar indicadores
      accountStatus.innerHTML = '<span class="status-badge status-waiting">Esperando escaneo</span>';
      statusDetail.textContent = 'Escanea este código con WhatsApp en tu teléfono';
      
      // Restablecer estado de refresh
      isRefreshingQR = false;
      refreshQrBtn.disabled = false;
      refreshQrBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Generar nuevo QR';
      
      addLogEntry('Nuevo código QR generado, escanea con tu teléfono', 'info');
    });
    
    // Recibir respuesta al logout
    socket.on('accountLoggedOut', (data) => {
      logoutBtn.disabled = false;
      logoutBtn.innerHTML = '<i class="bi bi-power me-1"></i> Cerrar sesión';
      
      if (data.success) {
        addLogEntry('Sesión cerrada correctamente', 'success');
        
        // Mostrar mensaje de espera por nuevo QR
        qrDisplay.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i>Sesión cerrada. Espera a que se genere un nuevo código QR...</div>';
        
        // Actualizar estado
        accountStatus.innerHTML = '<span class="status-badge status-waiting">Sesión cerrada</span>';
        connectionProgress.style.width = '0%';
        connectionProgress.setAttribute('aria-valuenow', 0);
        statusDetail.textContent = 'Esperando nuevo código QR...';
      } else {
        addLogEntry('Error al cerrar sesión: ' + (data.error || 'Error desconocido'), 'error');
      }
    });
    
    // Recibir respuesta al refrescar QR
    socket.on('qrRefreshError', (data) => {
      isRefreshingQR = false;
      refreshQrBtn.disabled = false;
      refreshQrBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Generar nuevo QR';
      
      addLogEntry('Error al regenerar QR: ' + data.error, 'error');
      qrDisplay.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Error al generar QR: ' + data.error + '</div>';
    });
    
    // Recibir logs de consola
    socket.on('consoleLog', (msg) => {
      addLogEntry(msg, msg.includes('ERROR') ? 'error' : 
                      msg.includes('CONECTADO') ? 'success' :
                      msg.includes('WARNING') ? 'warning' : 'info');
    });
    
    // Asociar eventos a botones
    logoutBtn.addEventListener('click', logoutAccount);
    refreshQrBtn.addEventListener('click', refreshQR);
    
    // Al cerrar la ventana, limpiar intervalos
    window.addEventListener('beforeunload', () => {
      clearInterval(loadingInterval);
      clearInterval(connectionCheckInterval);
    });
  </script>
</body>
</html>
  `;
  
  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public, { recursive: true });
  }
  
  // Guardar el HTML
  fs.writeFileSync(path.join(config.paths.public, config.files.indexHtml), htmlContent);
  console.log('Archivo HTML de índice creado correctamente');
}

module.exports = createIndexHtml;