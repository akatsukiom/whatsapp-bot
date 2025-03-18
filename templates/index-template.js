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
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: #25D366;
      --secondary-color: #128C7E;
      --dark-color: #075E54;
      --light-color: #DCF8C6;
      --bg-color: #f6f6f6;
      --card-bg: #ffffff;
      --text-color: #333333;
      --text-secondary: #707070;
    }
    
    body { 
      padding: 0;
      background-color: var(--bg-color);
      font-family: 'Poppins', sans-serif;
      color: var(--text-color);
    }
    
    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .app-header {
      background-color: var(--dark-color);
      color: white;
      border-radius: 15px;
      margin-bottom: 30px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    
    .app-header::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 200px;
      height: 100%;
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.1));
      transform: skewX(-30deg);
    }
    
    .header-content {
      position: relative;
      z-index: 1;
    }
    
    .stats-container {
      border-radius: 15px;
      background-color: var(--card-bg);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      margin-bottom: 30px;
      padding: 20px;
      transition: all 0.3s ease;
    }
    
    .stats-title {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      color: var(--dark-color);
    }
    
    .stats-title i {
      margin-right: 10px;
      font-size: 1.5rem;
    }
    
    .stat-card {
      border-radius: 12px;
      background: white;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 15px rgba(0, 0, 0, 0.08);
    }
    
    .stat-number {
      font-size: 36px;
      font-weight: 600;
      color: var(--dark-color);
      margin: 10px 0;
    }
    
    .btn-whatsapp {
      background-color: var(--primary-color);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 10px 25px;
      transition: all 0.3s ease;
      font-weight: 500;
    }
    
    .btn-whatsapp:hover {
      background-color: var(--secondary-color);
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(37, 211, 102, 0.3);
    }
    
    .btn-danger {
      background-color: #dc3545;
      border-radius: 50px;
      transition: all 0.3s ease;
    }
    
    .btn-danger:hover {
      background-color: #c82333;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(220, 53, 69, 0.3);
    }
    
    .btn-warning {
      background-color: #ffc107;
      color: #212529;
      border-radius: 50px;
      transition: all 0.3s ease;
    }
    
    .btn-warning:hover {
      background-color: #e0a800;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(255, 193, 7, 0.3);
    }
    
    .btn-refresh {
      background-color: #17a2b8;
      color: white;
      border-radius: 50px;
      transition: all 0.3s ease;
    }
    
    .btn-refresh:hover {
      background-color: #138496;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(23, 162, 184, 0.3);
    }
    
    .account-card {
      border-radius: 15px;
      background-color: var(--card-bg);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
      margin-bottom: 30px;
      overflow: hidden;
      transition: all 0.3s ease;
      position: relative;
    }
    
    .account-header {
      padding: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .account-phone {
      font-size: 20px;
      font-weight: 600;
      color: var(--dark-color);
    }
    
    .account-actions {
      display: flex;
      gap: 10px;
    }
    
    .account-status {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .status-indicator {
      height: 10px;
      width: 10px;
      border-radius: 50%;
      margin-right: 10px;
    }
    
    .status-connected {
      background-color: var(--primary-color);
    }
    
    .status-waiting {
      background-color: #ffc107;
    }
    
    .status-error {
      background-color: #dc3545;
    }
    
    .status-disconnected {
      background-color: #6c757d;
    }
    
    .account-content {
      padding: 20px;
    }
    
    .qr-container {
      display: flex;
      justify-content: center;
      padding: 20px 0;
      background-color: white;
      border-radius: 10px;
    }
    
    .qr-container img {
      max-width: 200px;
    }
    
    .progress-container {
      margin: 15px 0;
    }
    
    .progress {
      height: 8px;
      border-radius: 4px;
      margin-bottom: 8px;
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    .progress-bar {
      background-color: var(--primary-color);
      border-radius: 4px;
    }
    
    .status-detail {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 15px;
    }
    
    .account-active-badge {
      position: absolute;
      top: 20px;
      right: 20px;
      background-color: var(--primary-color);
      color: white;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(37, 211, 102, 0.3);
    }
    
    .account-waiting .account-header {
      border-left: 5px solid #ffc107;
    }
    
    .account-connected .account-header {
      border-left: 5px solid var(--primary-color);
    }
    
    .account-error .account-header {
      border-left: 5px solid #dc3545;
    }
    
    .account-disconnected .account-header {
      border-left: 5px solid #6c757d;
    }
    
    .logs-container {
      border-radius: 15px;
      background-color: var(--card-bg);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
      padding: 20px;
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 30px;
    }
    
    .logs-title {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      color: var(--dark-color);
    }
    
    .logs-title i {
      margin-right: 10px;
      font-size: 1.5rem;
    }
    
    .log-entry {
      padding: 8px 15px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      background-color: #f8f9fa;
      border-left: 3px solid #dee2e6;
    }
    
    .log-entry:last-child {
      margin-bottom: 0;
    }
    
    .log-entry.log-info {
      border-left-color: #17a2b8;
      background-color: rgba(23, 162, 184, 0.05);
    }
    
    .log-entry.log-success {
      border-left-color: var(--primary-color);
      background-color: rgba(37, 211, 102, 0.05);
    }
    
    .log-entry.log-warning {
      border-left-color: #ffc107;
      background-color: rgba(255, 193, 7, 0.05);
    }
    
    .log-entry.log-error {
      border-left-color: #dc3545;
      background-color: rgba(220, 53, 69, 0.05);
    }
    
    .connection-alert {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      min-width: 300px;
      display: none;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }
    
    .footer-actions {
      text-align: center;
      margin-top: 20px;
      margin-bottom: 40px;
    }
    
    .btn-admin {
      background-color: var(--secondary-color);
      color: white;
      padding: 12px 30px;
      font-size: 16px;
      border-radius: 50px;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .btn-admin:hover {
      background-color: var(--dark-color);
      box-shadow: 0 8px 20px rgba(7, 94, 84, 0.3);
      transform: translateY(-3px);
    }
    
    .add-account-btn {
      background-color: #6c5ce7;
      color: white;
      padding: 12px 25px;
      font-size: 16px;
      border-radius: 50px;
      font-weight: 600;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    
    .add-account-btn:hover {
      background-color: #5741d9;
      box-shadow: 0 8px 20px rgba(108, 92, 231, 0.3);
      transform: translateY(-3px);
    }
    
    .connection-status {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .connection-status i {
      margin-right: 5px;
    }
    
    .last-update {
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 5px;
    }
    
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      flex-direction: column;
    }
    
    .loader {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 8px solid rgba(37, 211, 102, 0.1);
      border-top-color: var(--primary-color);
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    .loading-text {
      font-size: 18px;
      font-weight: 500;
      color: var(--dark-color);
      margin-bottom: 20px;
    }
    
    .loading-progress {
      width: 300px;
      height: 8px;
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.05);
      overflow: hidden;
      margin-bottom: 10px;
    }
    
    .loading-progress-bar {
      height: 100%;
      background-color: var(--primary-color);
      border-radius: 4px;
      width: 0%;
      transition: width 0.5s ease;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Modal styles */
    .modal-content {
      border-radius: 15px;
      border: none;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    .modal-header {
      border-radius: 15px 15px 0 0;
      background-color: var(--dark-color);
      color: white;
      border-bottom: none;
    }
    
    .modal-body {
      padding: 25px;
    }
    
    .modal-footer {
      border-top: none;
      padding: 15px 25px 25px;
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
      animation: fadeIn 0.5s ease forwards;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .account-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .account-actions {
        margin-top: 15px;
        width: 100%;
        justify-content: space-between;
      }
      
      .account-active-badge {
        top: 15px;
        right: 15px;
      }
    }
  </style>
</head>
<body>
  <!-- Alerta de conexión -->
  <div id="connection-alert" class="connection-alert alert alert-danger">
    <i class="bi bi-wifi-off me-2"></i> Se ha perdido la conexión con el servidor. Intentando reconectar...
  </div>
  
  <!-- Loading Overlay -->
  <div id="loading-overlay" class="loading-overlay">
    <div class="loader"></div>
    <h3 class="loading-text">Inicializando WhatsApp Bot</h3>
    <div class="loading-progress">
      <div id="loading-progress-bar" class="loading-progress-bar" style="width: 25%"></div>
    </div>
    <p id="loading-message" class="text-muted">Preparando conexiones de WhatsApp...</p>
  </div>

  <div class="app-container">
    <!-- Header -->
    <div class="app-header animate-fade-in">
      <div class="header-content">
        <div class="d-flex justify-content-between align-items-center">
          <h1 class="mb-0"><i class="bi bi-whatsapp me-2"></i>WhatsApp Bot Manager</h1>
          <span id="connection-status" class="connection-status">
            <i class="bi bi-wifi me-1"></i> Conectando...
          </span>
        </div>
      </div>
    </div>
    
    <!-- Stats Container -->
    <div class="stats-container animate-fade-in" style="animation-delay: 0.1s">
      <div class="stats-title">
        <i class="bi bi-graph-up-arrow"></i>
        <h3 class="mb-0">Resumen de conexiones</h3>
        <div class="ms-auto">
          <button id="refresh-stats-btn" class="btn btn-refresh btn-sm">
            <i class="bi bi-arrow-clockwise me-1"></i> Actualizar
          </button>
        </div>
      </div>
      
      <div class="row g-4">
        <div class="col-md-4">
          <div class="stat-card">
            <h5 class="text-secondary">Total de cuentas</h5>
            <div class="stat-number" id="total-accounts">0</div>
            <div class="text-secondary">Cuentas configuradas</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="stat-card">
            <h5 class="text-secondary">Cuentas conectadas</h5>
            <div class="stat-number" id="connected-accounts">0</div>
            <div class="text-secondary">Sesiones activas</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="stat-card">
            <h5 class="text-secondary">Cuenta activa</h5>
            <div class="stat-number" id="active-account">-</div>
            <div class="text-secondary">Respondiendo mensajes</div>
          </div>
        </div>
      </div>
      
      <div class="last-update text-center mt-3">
        Última actualización: <span id="last-update-time">--:--:--</span>
      </div>
    </div>
    
    <!-- Accounts Container -->
    <div id="accounts-container" class="animate-fade-in" style="animation-delay: 0.2s">
      <!-- Dynamic accounts will be added here -->
      <div id="no-accounts-message" class="text-center p-5 my-4 bg-light rounded-3">
        <i class="bi bi-phone-vibrate display-1 text-secondary mb-3"></i>
        <h3>No hay cuentas configuradas</h3>
        <p class="text-secondary">Añade una cuenta de WhatsApp para comenzar</p>
      </div>
    </div>
    
    <!-- Add Account Button -->
    <div class="text-center my-4 animate-fade-in" style="animation-delay: 0.3s">
      <button id="add-account-btn" class="add-account-btn">
        <i class="bi bi-plus-circle"></i> Agregar nueva cuenta
      </button>
    </div>
    
    <!-- Logs Container -->
    <div class="logs-container animate-fade-in" style="animation-delay: 0.4s">
      <div class="logs-title">
        <i class="bi bi-journal-text"></i>
        <h3 class="mb-0">Historial de eventos</h3>
        <div class="ms-auto">
          <button id="clear-logs-btn" class="btn btn-sm btn-outline-danger">
            <i class="bi bi-trash"></i> Limpiar
          </button>
        </div>
      </div>
      
      <div id="event-log">
        <div class="log-entry text-muted">Esperando eventos...</div>
      </div>
    </div>
    
    <!-- Footer Actions -->
    <div class="footer-actions animate-fade-in" style="animation-delay: 0.5s">
      <a href="/admin" class="btn btn-admin">
        <i class="bi bi-gear-fill me-2"></i>Panel de Administración
      </a>
    </div>
  </div>
  
  <!-- Modal para agregar cuenta -->
  <div class="modal fade" id="add-account-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Agregar nueva cuenta</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form id="add-account-form">
            <div class="mb-3">
              <label for="phone-number" class="form-label">Número de teléfono (con código de país)</label>
              <input type="text" class="form-control" id="phone-number" placeholder="Ej: 521234567890" required>
              <div class="form-text">Ingresa el número completo incluyendo el código de país, sin espacios ni símbolos.</div>
            </div>
            <div class="mb-3">
              <label for="session-name" class="form-label">Nombre de sesión (opcional)</label>
              <input type="text" class="form-control" id="session-name" placeholder="Ej: cuenta_principal">
              <div class="form-text">Si se deja vacío, se generará automáticamente.</div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-whatsapp" id="add-account-submit">Agregar cuenta</button>
        </div>
      </div>
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
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingProgressBar = document.getElementById('loading-progress-bar');
    const loadingMessage = document.getElementById('loading-message');
    const accountsContainer = document.getElementById('accounts-container');
    const noAccountsMessage = document.getElementById('no-accounts-message');
    const eventLog = document.getElementById('event-log');
    const totalAccountsEl = document.getElementById('total-accounts');
    const connectedAccountsEl = document.getElementById('connected-accounts');
    const activeAccountEl = document.getElementById('active-account');
    const lastUpdateTimeEl = document.getElementById('last-update-time');
    const refreshStatsBtn = document.getElementById('refresh-stats-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const addAccountBtn = document.getElementById('add-account-btn');
    const addAccountSubmitBtn = document.getElementById('add-account-submit');
    const phoneNumberInput = document.getElementById('phone-number');
    const sessionNameInput = document.getElementById('session-name');
    
    // Referencias a modales
    const addAccountModal = new bootstrap.Modal(document.getElementById('add-account-modal'));
    
    // Variables de estado
    let loadingInterval;
    let progressValue = 25;
    let lastHeartbeat = Date.now();
    let connectionActive = false;
    let connectionCheckInterval;
    let qrRefreshInProgress = {};
    let accounts = {};
    
    // Iniciar animación de carga
    loadingInterval = setInterval(() => {
      if (progressValue < 90) {
        progressValue += 5;
        loadingProgressBar.style.width = progressValue + '%';
        
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
        connectionStatus.className = 'connection-status bg-danger';
        connectionStatus.innerHTML = '<i class="bi bi-wifi-off me-1"></i> Desconectado';
        connectionAlert.style.display = 'block';
        addLogEntry('Se ha perdido la conexión con el servidor', 'error');
      }
    }, 5000);
    
    // Función para mostrar/ocultar el mensaje de no accounts
    function toggleNoAccountsMessage() {
      const accountElements = accountsContainer.querySelectorAll('.account-card');
      if (accountElements.length === 0) {
        noAccountsMessage.style.display = 'block';
      } else {
        noAccountsMessage.style.display = 'none';
      }
    }
    
    // Función para mostrar eventos en el log
    function addLogEntry(message, type = 'info') {
      const now = new Date().toLocaleTimeString();
      const icons = {
        info: 'info-circle',
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
      };
      
      const entry = document.createElement('div');
      entry.className = 'log-entry log-' + type;
      entry.innerHTML = '<i class="bi bi-' + icons[type] + ' me-1"></i>' +
                        '<small>' + now + '</small> - ' + message;
      
      // Remover "Esperando eventos..." si existe
      const emptyLog = eventLog.querySelector('.text-muted');
      if (emptyLog) {
        eventLog.innerHTML = '';
      }
      
      eventLog.prepend(entry);
      
      // Limitar a 20 entradas
      if (eventLog.children.length > 20) {
        eventLog.removeChild(eventLog.lastChild);
      }
    }
    
    // Función para renderizar una tarjeta de cuenta
    function renderAccountCard(account) {
      // Definir estado y progreso
      let statusClass = 'waiting';
      let statusText = 'Esperando';
      let progress = 0;
      let statusIndicatorClass = 'status-waiting';
      
      switch (account.status) {
        case 'ready':
          statusClass = 'connected';
          statusText = 'Conectado';
          progress = 100;
          statusIndicatorClass = 'status-connected';
          break;
        case 'authenticated':
          statusClass = 'connected';
          statusText = 'Autenticado';
          progress = 70;
          statusIndicatorClass = 'status-connected';
          break;
        case 'waiting':
          statusClass = 'waiting';
          statusText = 'Esperando QR';
          progress = 40;
          statusIndicatorClass = 'status-waiting';
          break;
        case 'initializing':
          statusClass = 'waiting';
          statusText = 'Inicializando';
          progress = 20;
          statusIndicatorClass = 'status-waiting';
          break;
        case 'disconnected':
          statusClass = 'disconnected';
          statusText = 'Desconectado';
          progress = 0;
          statusIndicatorClass = 'status-disconnected';
          break;
        case 'error':
          statusClass = 'error';
          statusText = 'Error';
          progress = 0;
          statusIndicatorClass = 'status-error';
          break;
      }
      
   // Crear o actualizar el elemento de la cuenta
      let accountElement = document.getElementById('account-' + account.sessionName);
      
      if (!accountElement) {
        accountElement = document.createElement('div');
        accountElement.id = 'account-' + account.sessionName;
        accountElement.className = 'account-card account-' + statusClass + ' animate-fade-in';
        
        accountElement.innerHTML = `
          <div class="account-header">
            <div class="account-phone">${account.phoneNumber}</div>
            <div class="account-actions">
              <button class="btn btn-warning btn-sm refresh-qr-btn" data-session="${account.sessionName}">
                <i class="bi bi-arrow-repeat me-1"></i> Refrescar QR
              </button>
              <button class="btn btn-danger btn-sm logout-btn" data-session="${account.sessionName}" ${account.status !== 'ready' && account.status !== 'authenticated' ? 'disabled' : ''}>
                <i class="bi bi-power me-1"></i> Cerrar sesión
              </button>
              <button class="btn btn-secondary btn-sm delete-btn" data-session="${account.sessionName}">
                <i class="bi bi-trash me-1"></i> Eliminar
              </button>
            </div>
          </div>
          <div class="account-content">
            <div class="account-status">
              <div class="status-indicator ${statusIndicatorClass}"></div>
              <span class="status-text">${statusText}</span>
            </div>
            
            <div class="status-detail" id="status-detail-${account.sessionName}">
              ${account.detail || 'Sin detalles adicionales'}
            </div>
            
            <div class="progress-container">
              <div class="progress">
                <div class="progress-bar" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
            
            <div id="qr-container-${account.sessionName}" class="qr-container">
              ${account.qrData ? 
                `<img src="${account.qrData}" alt="Código QR" class="img-fluid">` : 
                account.status === 'ready' || account.status === 'authenticated' ? 
                  `<div class="alert alert-success text-center"><i class="bi bi-check-circle-fill me-2"></i>WhatsApp conectado correctamente</div>` :
                  `<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div>`
              }
            </div>
          </div>
          ${account.active ? '<div class="account-active-badge"><i class="bi bi-star-fill me-1"></i> ACTIVA</div>' : ''}
        `;
        
        accountsContainer.appendChild(accountElement);
        
        // Agregar eventos a los botones
        const refreshQrBtn = accountElement.querySelector('.refresh-qr-btn');
        refreshQrBtn.addEventListener('click', () => {
          refreshQR(account.sessionName);
        });
        
        const logoutBtn = accountElement.querySelector('.logout-btn');
        logoutBtn.addEventListener('click', () => {
          logoutAccount(account.sessionName);
        });

        const deleteBtn = accountElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
          deleteAccount(account.sessionName);
        });
      } else {
        // Actualizar clase de estado
        accountElement.className = 'account-card account-' + statusClass + ' animate-fade-in';
        
        // Actualizar estado
        const statusTextEl = accountElement.querySelector('.status-text');
        if (statusTextEl) statusTextEl.textContent = statusText;
        
        const statusIndicatorEl = accountElement.querySelector('.status-indicator');
        if (statusIndicatorEl) {
          statusIndicatorEl.className = 'status-indicator ' + statusIndicatorClass;
        }
        
        // Actualizar detalle de estado
        const statusDetailEl = accountElement.querySelector(`#status-detail-${account.sessionName}`);
        if (statusDetailEl && account.detail) {
          statusDetailEl.textContent = account.detail;
        }
        
        // Actualizar progreso
        const progressBarEl = accountElement.querySelector('.progress-bar');
        if (progressBarEl) {
          progressBarEl.style.width = progress + '%';
          progressBarEl.setAttribute('aria-valuenow', progress);
        }
        
        // Actualizar QR si está disponible
        if (account.qrData) {
          const qrContainerEl = accountElement.querySelector(`#qr-container-${account.sessionName}`);
          if (qrContainerEl) {
            qrContainerEl.innerHTML = `<img src="${account.qrData}" alt="Código QR" class="img-fluid">`;
          }
        } else if (account.status === 'ready' || account.status === 'authenticated') {
          const qrContainerEl = accountElement.querySelector(`#qr-container-${account.sessionName}`);
          if (qrContainerEl) {
            qrContainerEl.innerHTML = `<div class="alert alert-success text-center"><i class="bi bi-check-circle-fill me-2"></i>WhatsApp conectado correctamente</div>`;
          }
        }
        
        // Actualizar botón de cerrar sesión
        const logoutBtn = accountElement.querySelector('.logout-btn');
        if (logoutBtn) {
          logoutBtn.disabled = account.status !== 'ready' && account.status !== 'authenticated';
        }
        
        // Actualizar badge activo
        const existingBadge = accountElement.querySelector('.account-active-badge');
        if (account.active && !existingBadge) {
          const badge = document.createElement('div');
          badge.className = 'account-active-badge';
          badge.innerHTML = '<i class="bi bi-star-fill me-1"></i> ACTIVA';
          accountElement.appendChild(badge);
        } else if (!account.active && existingBadge) {
          existingBadge.remove();
        }
      }
      
      toggleNoAccountsMessage();
    }
    
    // Función para cerrar sesión
    function logoutAccount(sessionName) {
      if (confirm('¿Estás seguro de cerrar la sesión de esta cuenta? Se eliminarán los datos de sesión y será necesario escanear un nuevo código QR.')) {
        const accountElement = document.getElementById('account-' + sessionName);
        if (accountElement) {
          const logoutBtn = accountElement.querySelector('.logout-btn');
          if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cerrando...';
          }
        }
        
        socket.emit('logoutAccount', sessionName);
        addLogEntry(`Solicitando cierre de sesión para ${accounts[sessionName]?.phoneNumber || sessionName}...`, 'warning');
      }
    }
    
    // Función para refrescar código QR
    function refreshQR(sessionName) {
      // Verificar si ya está en proceso
      if (qrRefreshInProgress[sessionName]) {
        addLogEntry(`Ya hay una solicitud de regeneración de QR en proceso para ${accounts[sessionName]?.phoneNumber || sessionName}`, 'warning');
        return;
      }
      
      if (confirm('¿Estás seguro de regenerar el código QR? Esto cerrará la sesión actual si está activa.')) {
        const accountElement = document.getElementById('account-' + sessionName);
        if (accountElement) {
          const refreshBtn = accountElement.querySelector('.refresh-qr-btn');
          if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refrescando...';
          }
          
          const qrContainerEl = accountElement.querySelector(`#qr-container-${sessionName}`);
          if (qrContainerEl) {
            qrContainerEl.innerHTML = `
              <div class="text-center p-3">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p>Regenerando código QR...</p>
              </div>
            `;
          }
        }
        
        // Marcar como en proceso
        qrRefreshInProgress[sessionName] = true;
        
        // Establecer un timeout para restablecer el estado después de 30 segundos
        setTimeout(() => {
          if (qrRefreshInProgress[sessionName]) {
            qrRefreshInProgress[sessionName] = false;
            
            // Restablecer botón si aún está en proceso
            const accountElement = document.getElementById('account-' + sessionName);
            if (accountElement) {
              const refreshBtn = accountElement.querySelector('.refresh-qr-btn');
              if (refreshBtn && refreshBtn.disabled) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Refrescar QR';
                
                addLogEntry(`Timeout al regenerar QR para ${accounts[sessionName]?.phoneNumber || sessionName}`, 'warning');
              }
            }
          }
        }, 30000);
        
        socket.emit('refreshQR', sessionName);
        addLogEntry(`Solicitando regeneración de QR para ${accounts[sessionName]?.phoneNumber || sessionName}...`, 'info');
      }
    }

    // Función para eliminar una cuenta
    function deleteAccount(sessionName) {
      if (confirm('¿Estás seguro de eliminar esta cuenta? Se eliminarán todos los datos asociados.')) {
        const accountElement = document.getElementById('account-' + sessionName);
        if (accountElement) {
          const deleteBtn = accountElement.querySelector('.delete-btn');
          if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Eliminando...';
          }
        }
        
        socket.emit('removeAccount', sessionName);
        addLogEntry(`Solicitando eliminar cuenta ${accounts[sessionName]?.phoneNumber || sessionName}...`, 'warning');
      }
    }

    // Función para agregar nueva cuenta
    function addNewAccount() {
      const phoneNumber = phoneNumberInput.value.trim();
      const sessionName = sessionNameInput.value.trim() || '';
      
      if (!phoneNumber) {
        alert('Por favor ingresa un número de teléfono válido');
        return;
      }
      
      // Cerrar modal
      addAccountModal.hide();
      
      // Enviar solicitud al servidor
      socket.emit('addAccount', {
        phoneNumber,
        sessionName: sessionName || `cuenta_${Date.now()}`
      });
      
      addLogEntry(`Solicitando agregar nueva cuenta: ${phoneNumber}...`, 'info');
      
      // Limpiar formulario
      phoneNumberInput.value = '';
      sessionNameInput.value = '';
    }
    
    // Actualizar estadísticas de conexión
    function updateConnectionStats() {
      const accountsList = Object.values(accounts);
      totalAccountsEl.textContent = accountsList.length;
      
      const connectedAccounts = accountsList.filter(acc => 
        acc.status === 'ready' || acc.status === 'authenticated'
      ).length;
      connectedAccountsEl.textContent = connectedAccounts;
      
      const activeAccount = accountsList.find(acc => acc.active);
      if (activeAccount) {
        activeAccountEl.textContent = activeAccount.phoneNumber;
      } else {
        activeAccountEl.textContent = '-';
      }
      
      // Actualizar hora de última actualización
      const now = new Date();
      lastUpdateTimeEl.textContent = now.toLocaleTimeString();
    }
    
    // Eventos Socket.IO
    socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
      
      connectionActive = true;
      connectionStatus.className = 'connection-status bg-success';
      connectionStatus.innerHTML = '<i class="bi bi-wifi me-1"></i> Conectado';
      
      // Ocultar alerta de conexión perdida
      connectionAlert.style.display = 'none';
      
      addLogEntry('Conectado al servidor correctamente', 'success');
      
      // Solicitar estado actual
      socket.emit('requestStatus');
      socket.emit('requestSystemInfo');
    });
    
    socket.on('disconnect', () => {
      connectionActive = false;
      connectionStatus.className = 'connection-status bg-danger';
      connectionStatus.innerHTML = '<i class="bi bi-wifi-off me-1"></i> Desconectado';
      
      // Mostrar alerta de conexión perdida
      connectionAlert.style.display = 'block';
      
      addLogEntry('Se ha perdido la conexión con el servidor', 'error');
    });
    
    // Latidos para verificar la conexión
    socket.on('heartbeat', (data) => {
      lastHeartbeat = data.timestamp;
      
      if (!connectionActive) {
        connectionActive = true;
        connectionStatus.className = 'connection-status bg-success';
        connectionStatus.innerHTML = '<i class="bi bi-wifi me-1"></i> Conectado';
        
        // Ocultar alerta de conexión perdida
        connectionAlert.style.display = 'none';
        
        addLogEntry('Conexión con el servidor restablecida', 'success');
      }
    });
    
    // Recibir información del sistema
    socket.on('systemInfo', (data) => {
      totalAccountsEl.textContent = data.accounts;
      connectedAccountsEl.textContent = data.connectedAccounts;
      activeAccountEl.textContent = data.activeAccount;
      
      // Actualizar hora de última actualización
      const now = new Date();
      lastUpdateTimeEl.textContent = now.toLocaleTimeString();
      
      // Si no hay cuentas mostradas pero hay cuentas en el sistema, solicitarlas
      if (Object.keys(accounts).length === 0 && data.accounts > 0) {
        socket.emit('requestStatus');
      }
    });
    
    // Manejar códigos QR
    socket.on('qr', (data) => {
      console.log('QR recibido para:', data.sessionName);
      
      // Completar carga si es el primer QR
      if (loadingOverlay.style.display !== 'none') {
        clearInterval(loadingInterval);
        loadingOverlay.style.display = 'none';
      }
      
      // Almacenar información de la cuenta
      if (!accounts[data.sessionName]) {
        accounts[data.sessionName] = {
          sessionName: data.sessionName,
          phoneNumber: data.phoneNumber,
          status: 'waiting',
          detail: 'Esperando escaneo de QR',
          active: false,
          qrData: data.qrDataUrl
        };
      } else {
        accounts[data.sessionName].qrData = data.qrDataUrl;
        accounts[data.sessionName].status = 'waiting';
        accounts[data.sessionName].detail = 'Esperando escaneo de QR';
      }
      
      // Renderizar o actualizar la tarjeta de la cuenta
      renderAccountCard(accounts[data.sessionName]);
      updateConnectionStats();
      
      // Restablecer el estado de refresh QR
      qrRefreshInProgress[data.sessionName] = false;
      const accountElement = document.getElementById('account-' + data.sessionName);
      if (accountElement) {
        const refreshBtn = accountElement.querySelector('.refresh-qr-btn');
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Refrescar QR';
        }
      }
      
      addLogEntry(`Nuevo código QR generado para ${data.phoneNumber}`, 'info');
    });
    
    // Manejar actualizaciones de estado
    socket.on('status', (data) => {
      console.log('Estado actualizado:', data);
      
      // Completar carga si es la primera actualización de estado
      if (loadingOverlay.style.display !== 'none') {
        clearInterval(loadingInterval);
        loadingOverlay.style.display = 'none';
      }
      
      // Si es un evento del sistema, solo procesarlo como log
      if (data.sessionName === 'sistema') {
        if (data.message) {
          addLogEntry(data.message, data.status === 'error' ? 'error' : 'info');
        }
        return;
      }
      
      // Actualizar en nuestro registro de cuentas
      if (!accounts[data.sessionName]) {
        accounts[data.sessionName] = {
          sessionName: data.sessionName,
          phoneNumber: data.phoneNumber,
          status: data.status,
          detail: data.detail || '',
          active: data.active || false,
          qrData: null
        };
      } else {
        const prevStatus = accounts[data.sessionName].status;
        accounts[data.sessionName].status = data.status;
        accounts[data.sessionName].detail = data.detail || '';
        accounts[data.sessionName].active = data.active || false;
        
        // Verificar si cambió de estado desconectado a preparado o autenticado
        const statusChanged = prevStatus !== data.status && 
                            (data.status === 'ready' || data.status === 'authenticated');
        
        // Si acaba de conectarse, mostrar log
        if (statusChanged) {
          addLogEntry(`${data.phoneNumber}: Conectado exitosamente`, 'success');
        }
      }
      
      // Renderizar o actualizar la tarjeta de la cuenta
      renderAccountCard(accounts[data.sessionName]);
      updateConnectionStats();
      
      // Sólo agregar al log si ha cambiado de estado
      if (data.status !== accounts[data.sessionName].lastStatus) {
        accounts[data.sessionName].lastStatus = data.status;
        
        let logType = 'info';
        if (data.status === 'ready' || data.status === 'authenticated') {
          logType = 'success';
        } else if (data.status === 'disconnected' || data.status === 'error') {
          logType = 'error';
        } else if (data.status === 'initializing' || data.status === 'waiting') {
          logType = 'warning';
        }
        
        addLogEntry(
          `${data.phoneNumber}: ${data.status}${data.active ? ' (ACTIVA)' : ''}${data.detail ? ' - ' + data.detail : ''}`,
          logType
        );
      }
    });
    
    // Manejar respuesta de cierre de sesión
    socket.on('accountLoggedOut', (data) => {
      if (data.success) {
        addLogEntry(`Sesión cerrada correctamente para la cuenta ${accounts[data.sessionName]?.phoneNumber || data.sessionName}`, 'success');
        
        // Actualizar estado de la cuenta
        if (accounts[data.sessionName]) {
          accounts[data.sessionName].status = 'disconnected';
          accounts[data.sessionName].active = false;
          accounts[data.sessionName].detail = 'Cerrado por usuario';
          accounts[data.sessionName].qrData = null;
          
          // Actualizar la tarjeta de la cuenta
          renderAccountCard(accounts[data.sessionName]);
        }
        
        // Solicitar actualización de estado
        socket.emit('requestStatus');
        socket.emit('requestSystemInfo');
      } else {
        addLogEntry(`Error al cerrar sesión: ${data.error || 'Error desconocido'}`, 'error');
        
        // Restablecer botón de cierre de sesión
        const accountElement = document.getElementById('account-' + data.sessionName);
        if (accountElement) {
          const logoutBtn = accountElement.querySelector('.logout-btn');
          if (logoutBtn) {
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = '<i class="bi bi-power me-1"></i> Cerrar sesión';
          }
        }
      }
    });
    
    // Manejar respuesta de eliminación de cuenta
    socket.on('accountRemoved', (data) => {
      if (data.success) {
        addLogEntry(`Cuenta ${accounts[data.sessionName]?.phoneNumber || data.sessionName} eliminada correctamente`, 'success');
        
        // Eliminar la cuenta de nuestro registro
        if (accounts[data.sessionName]) {
          delete accounts[data.sessionName];
        }
        
        // Eliminar el elemento del DOM
        const accountElement = document.getElementById('account-' + data.sessionName);
        if (accountElement) {
          accountElement.remove();
        }
        
        // Actualizar estadísticas
        updateConnectionStats();
        toggleNoAccountsMessage();
      } else {
        addLogEntry(`Error al eliminar cuenta: ${data.error || 'Error desconocido'}`, 'error');
        
        // Restablecer el botón
        const accountElement = document.getElementById('account-' + data.sessionName);
        if (accountElement) {
          const deleteBtn = accountElement.querySelector('.delete-btn');
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Eliminar';
          }
        }
      }
    });
    
    // Manejar respuestas de regeneración de QR
    socket.on('qrRefreshStarted', (data) => {
      addLogEntry(`Regeneración de QR iniciada para ${accounts[data.sessionName]?.phoneNumber || data.sessionName}`, 'info');
    });
    
    socket.on('qrRefreshError', (data) => {
      addLogEntry(`Error al regenerar QR: ${data.error}`, 'error');
      
      qrRefreshInProgress[data.sessionName] = false;
      
      const accountElement = document.getElementById('account-' + data.sessionName);
      if (accountElement) {
        const refreshBtn = accountElement.querySelector('.refresh-qr-btn');
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Refrescar QR';
        }
        
        const qrContainerEl = accountElement.querySelector(`#qr-container-${data.sessionName}`);
        if (qrContainerEl) {
          qrContainerEl.innerHTML = `<div class="alert alert-danger text-center"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error al generar QR: ${data.error}</div>`;
        }
      }
    });
    
    // Respuesta a la adición de cuenta
    socket.on('accountAdded', (data) => {
      if (data.success) {
        addLogEntry(`Cuenta agregada correctamente: ${data.phoneNumber}`, 'success');
        socket.emit('requestStatus');
        socket.emit('requestSystemInfo');
      } else {
        addLogEntry(`Error al agregar cuenta: ${data.error || 'Error desconocido'}`, 'error');
      }
    });
    
    // Asociar eventos a botones
    refreshStatsBtn.addEventListener('click', () => {
      socket.emit('requestStatus');
      socket.emit('requestSystemInfo');
      addLogEntry('Solicitando actualización de estado...', 'info');
    });
    
    clearLogsBtn.addEventListener('click', () => {
      eventLog.innerHTML = '<div class="log-entry text-muted">Historial de eventos limpiado</div>';
    });
    
    addAccountBtn.addEventListener('click', () => {
      addAccountModal.show();
    });
    
    addAccountSubmitBtn.addEventListener('click', addNewAccount);
    
    // También permitir enviar con Enter desde el formulario
    document.getElementById('add-account-form').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNewAccount();
      }
    });
    
    // Actualizar estado cada 30 segundos
    setInterval(() => {
      if (connectionActive) {
        socket.emit('requestStatus');
        socket.emit('requestSystemInfo');
      }
    }, 30000);
    
    // Al cerrar la ventana, limpiar intervalos
    window.addEventListener('beforeunload', () => {
      clearInterval(connectionCheckInterval);
      clearInterval(loadingInterval);
    });
  </script>
</body>
</html>`;
  
  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public, { recursive: true });
  }
  
  // Guardar el HTML
  fs.writeFileSync(path.join(config.paths.public, config.files.indexHtml), htmlContent);
  console.log('Archivo HTML de índice creado correctamente');
}

module.exports = createIndexHtml;