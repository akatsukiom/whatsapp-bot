// templates/admin-template.js - Versión corregida
const path = require('path');
const fs = require('fs');
const config = require('../config');

function createAdminHtml() {
  const adminHtmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Bot - Panel de Administración</title>
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
    
    .admin-panel {
      background-color: var(--card-bg);
      border-radius: 15px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
      padding: 25px;
      margin-bottom: 30px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .admin-panel h3 {
      color: var(--dark-color);
      margin-bottom: 20px;
      display: flex;
      align-items: center;
    }
    
    .admin-panel h3 i {
      margin-right: 10px;
      font-size: 1.5rem;
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
      display: none;
    }
    
    .loader {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 6px solid rgba(37, 211, 102, 0.1);
      border-top-color: var(--primary-color);
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1100;
    }
    
    .console-container, .chat-container {
      border-radius: 10px;
      border: 1px solid #eaeaea;
      padding: 0;
      background: #f8f9fa;
      height: 300px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .console-header, .chat-header {
      background-color: var(--dark-color);
      color: white;
      padding: 10px 15px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .console-header i, .chat-header i {
      margin-right: 10px;
    }
    
    #consoleLog, #botChat {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      background-color: #f8f9fa;
    }
    
    #botChat {
      font-family: 'Poppins', sans-serif;
    }
    
    .console-entry {
      margin-bottom: 8px;
      border-left: 3px solid #ccc;
      padding-left: 10px;
    }
    
    .chat-message {
      margin-bottom: 12px;
      max-width: 80%;
      padding: 10px 15px;
      border-radius: 15px;
      position: relative;
    }
    
    .chat-message.user-message {
      background-color: var(--light-color);
      margin-left: auto;
      border-bottom-right-radius: 4px;
    }
    
    .chat-message.bot-message {
      background-color: white;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    }
    
    .chat-sender {
      font-weight: 600;
      color: var(--dark-color);
      font-size: 13px;
      margin-bottom: 4px;
    }
    
    .chat-input-container {
      padding: 10px;
      border-top: 1px solid #eaeaea;
      display: flex;
      background-color: white;
    }
    
    .chat-input-container input {
      flex: 1;
      border-radius: 20px;
      border: 1px solid #eaeaea;
      padding: 8px 15px;
      outline: none;
    }
    
    .chat-input-container button {
      margin-left: 10px;
      border-radius: 50%;
      width: 38px;
      height: 38px;
      background-color: var(--primary-color);
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .chat-input-container button:hover {
      background-color: var(--secondary-color);
      transform: scale(1.05);
    }
    
   .btn-action-group {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    
    .btn-group {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    
    .btn-primary, .btn-success, .btn-info, .btn-warning {
      border-radius: 30px;
      padding: 8px 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.3s ease;
      font-weight: 500;
      border: none;
    }

  .btn-primary {
      background-color: #4361ee;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #3a56d4;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(67, 97, 238, 0.3);
    }
    
    .btn-success {
      background-color: var(--primary-color);
      color: white;
    }
    
    .btn-success:hover {
      background-color: var(--secondary-color);
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(37, 211, 102, 0.3);
    }
    
    .btn-info {
      background-color: #3498db;
      color: white;
    }
    
    .btn-info:hover {
      background-color: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3);
    }
    
    .table {
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
    }
    
    .table thead {
      background-color: var(--dark-color);
      color: white;
    }
    
    .table th {
      font-weight: 500;
      padding: 12px 15px;
      border: none;
    }
    
    .table td {
      padding: 12px 15px;
      vertical-align: middle;
      border-color: #f2f2f2;
    }
    
    .table tbody tr {
      transition: all 0.3s ease;
    }
    
    .table tbody tr:hover {
      background-color: #f8f9fa;
    }
    
    .table-responsive {
      border-radius: 10px;
      overflow: hidden;
    }
    
    .table .btn-sm {
      border-radius: 30px;
      padding: 5px 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.3s ease;
      margin-right: 5px;
    }
    
    .form-control, .form-select {
      border-radius: 30px;
      padding: 10px 15px;
      border: 1px solid #eaeaea;
      font-size: 15px;
      transition: all 0.3s ease;
    }
    
    .form-control:focus, .form-select:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.2);
    }
    
    textarea.form-control {
      border-radius: 15px;
      padding: 15px;
    }
    
    .form-label {
      font-weight: 500;
      color: var(--dark-color);
      margin-bottom: 8px;
    }
    
    .form-text {
      color: var(--text-secondary);
    }
    
    .form-check-input:checked {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }
    
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
    
    /* Animaciones */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
      animation: fadeIn 0.5s ease forwards;
    }
    
    /* Efectos de hover en botones de acción */
    .edit-btn:hover {
      background-color: #ffc107;
      color: #000;
    }
    
    .delete-btn:hover {
      background-color: #dc3545;
      color: #fff;
    }
    
    .quick-btn:hover {
      background-color: #0dcaf0;
      color: #fff;
    }
  </style>
</head>
<body>
  <!-- Overlay de carga -->
  <div id="loadingOverlay" class="loading-overlay">
    <div class="loader"></div>
    <p>Procesando solicitud...</p>
  </div>

  <!-- Contenedor de notificaciones -->
  <div class="toast-container" id="toastContainer"></div>

  <div class="app-container">
    <!-- Encabezado -->
    <div class="app-header animate-fade-in">
      <div class="d-flex justify-content-between align-items-center">
        <h1 class="mb-0">
          <i class="bi bi-whatsapp me-2"></i>Panel de Administración
        </h1>
        <a href="/" class="btn btn-outline-light btn-sm">
          <i class="bi bi-arrow-left me-1"></i> Volver al Dashboard
        </a>
      </div>
    </div>
    
    <!-- Formulario para agregar nueva respuesta -->
    <div class="admin-panel animate-fade-in" style="animation-delay: 0.1s">
      <h3><i class="bi bi-plus-circle"></i>Agregar nueva respuesta</h3>
      <form id="addResponseForm">
        <div class="mb-3">
          <label for="trigger" class="form-label">Cuando el usuario escriba:</label>
          <input type="text" class="form-control" id="trigger" placeholder="Ej: hola, información, precios, etc." required>
        </div>
        <div class="mb-3">
          <label for="response" class="form-label">El bot responderá:</label>
          <textarea class="form-control" id="response" rows="3" placeholder="Escribe la respuesta que dará el bot..." required></textarea>
        </div>
        <button type="submit" class="btn btn-success">
          <i class="bi bi-save"></i> Guardar respuesta
        </button>
      </form>
    </div>
    
    <!-- Paneles en línea: Console Log y Mensajería en Tiempo Real -->
    <div class="row g-4 animate-fade-in" style="animation-delay: 0.2s">
      <div class="col-md-6">
        <div class="admin-panel h-100 p-0">
          <div class="console-container">
            <div class="console-header">
              <span><i class="bi bi-terminal"></i>Console Log</span>
              <button id="clearConsole" class="btn btn-sm btn-outline-light">
                <i class="bi bi-trash"></i> Limpiar
              </button>
            </div>
            <div id="consoleLog"></div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="admin-panel h-100 p-0">
          <div class="chat-container">
            <div class="chat-header">
              <span><i class="bi bi-chat-dots"></i>Mensajería en Tiempo Real</span>
              <button id="clearChat" class="btn btn-sm btn-outline-light">
                <i class="bi bi-trash"></i> Limpiar
              </button>
            </div>
            <div id="botChat"></div>
            <div class="chat-input-container">
              <input type="text" id="chatInput" placeholder="Escribe un mensaje para el bot...">
              <button id="sendChatBtn">
                <i class="bi bi-send-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  <!-- Panel de Respuestas Configuradas -->
    <div class="admin-panel animate-fade-in" style="animation-delay: 0.3s">
      <h3><i class="bi bi-list-check"></i>Respuestas configuradas</h3>
      <div class="btn-action-group">
        <button id="exportResponses" class="btn btn-info">
          <i class="bi bi-download"></i> Exportar respuestas
        </button>
        <button id="importResponses" class="btn btn-success">
          <i class="bi bi-upload"></i> Importar respuestas
        </button>
        <button id="refreshResponses" class="btn btn-primary">
          <i class="bi bi-arrow-clockwise"></i> Actualizar respuestas
        </button>
      </div>
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Cuando el usuario escriba</th>
              <th>El bot responderá</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="responsesTable">
            <!-- Se cargarán las respuestas -->
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Panel de configuración de IA -->
    <div class="admin-panel animate-fade-in" style="animation-delay: 0.4s">
      <h3><i class="bi bi-robot"></i>Configuración de IA (OpenAI)</h3>
      <div class="alert alert-info">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Nota:</strong> Configura cómo responderá la IA cuando no haya una respuesta predefinida.
      </div>
      <form id="aiConfigForm">
        <div class="mb-3">
          <label for="aiModel" class="form-label">Modelo de IA</label>
          <select class="form-select" id="aiModel">
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (más rápido)</option>
            <option value="gpt-4">GPT-4 (más inteligente)</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="privateMessage" class="form-label">Mensaje de redirección al privado</label>
          <textarea class="form-control" id="privateMessage" rows="2"></textarea>
          <div class="form-text">Este mensaje se añadirá automáticamente cuando corresponda.</div>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="alwaysRedirect">
          <label class="form-check-label" for="alwaysRedirect">
            Siempre redirigir al privado
          </label>
          <div class="form-text">Si está desactivado, solo redirigirá en consultas específicas.</div>
        </div>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-check-circle"></i> Guardar configuración
        </button>
      </form>
    </div>
  </div>

  <!-- Modal para importar respuestas -->
  <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="importModalLabel">Importar respuestas</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="importFile" class="form-label">Selecciona archivo JSON de respuestas</label>
            <input class="form-control" type="file" id="importFile" accept=".json">
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="replaceResponses">
            <label class="form-check-label" for="replaceResponses">
              Reemplazar respuestas existentes (si no se marca, se añaden a las actuales)
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-success" id="confirmImport">
            <i class="bi bi-check2"></i> Importar
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Conectar a Socket.IO
    const socket = io();
    
    // Elementos del DOM
    const addResponseForm = document.getElementById('addResponseForm');
    const triggerInput = document.getElementById('trigger');
    const responseInput = document.getElementById('response');
    const responsesTable = document.getElementById('responsesTable');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toastContainer = document.getElementById('toastContainer');
    const consoleLogDiv = document.getElementById('consoleLog');
    const botChatDiv = document.getElementById('botChat');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const exportBtn = document.getElementById('exportResponses');
    const importBtn = document.getElementById('importResponses');
    const refreshBtn = document.getElementById('refreshResponses');
    const confirmImportBtn = document.getElementById('confirmImport');
    const clearConsoleBtn = document.getElementById('clearConsole');
    const clearChatBtn = document.getElementById('clearChat');
    
    // Función para mostrar/ocultar overlay de carga
    function toggleLoading(show) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // Manejo de reconexión
    socket.on('disconnect', () => {
      console.error('Conexión perdida. Intentando reconectar...');
      showToast('Conexión perdida. Intentando reconectar...', 'error');
    });

    socket.on('connect', () => {
      if (socket.hasReconnected) {
        console.log('Reconectado al servidor');
        showToast('Conexión restablecida', 'success');
        // Refrescar datos después de reconexión
        socket.emit('getResponses');
        socket.emit('getAIConfig');
      }
      socket.hasReconnected = true;
    });

    // Función para mostrar notificaciones (toast)
    function showToast(message, type = 'success') {
      const toastId = 'toast-' + Date.now();
      const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'}" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-circle'}-fill me-2"></i>
              ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      `;
      toastContainer.insertAdjacentHTML('beforeend', toastHtml);
      const toastElement = document.getElementById(toastId);
      const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
      });
      toast.show();
    }

    // Cargar configuración de IA al iniciar
    socket.emit('getAIConfig');

    // Recibir configuración de IA
    socket.on('aiConfig', (config) => {
      document.getElementById('aiModel').value = config.model;
      document.getElementById('privateMessage').value = config.privateMessage;
      document.getElementById('alwaysRedirect').checked = config.privateRedirect;
    });

    // Enviar actualización de configuración de IA
    document.getElementById('aiConfigForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const config = {
        model: document.getElementById('aiModel').value,
        privateMessage: document.getElementById('privateMessage').value,
        privateRedirect: document.getElementById('alwaysRedirect').checked
      };
      
      toggleLoading(true);
      socket.emit('updateAIConfig', config);
    });

    // Confirmar actualización
    socket.on('aiConfigUpdated', () => {
      toggleLoading(false);
      showToast('Configuración de IA actualizada correctamente');
    });

    // Cargar respuestas existentes
    toggleLoading(true);
    socket.emit('getResponses');
    
    socket.on('responsesList', (responses) => {
      toggleLoading(false);
      responsesTable.innerHTML = '';
      if (!responses || Object.keys(responses).length === 0) {
        responsesTable.innerHTML = '<tr><td colspan="3" class="text-center py-4">No hay respuestas configuradas</td></tr>';
        return;
      }
      
      // Ordenar las respuestas alfabéticamente
      const sortedTriggers = Object.keys(responses).sort();
      
      sortedTriggers.forEach(trigger => {
        const response = responses[trigger];
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${trigger}</td>
          <td>${response}</td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-trigger="${trigger}">
              <i class="bi bi-pencil-fill"></i> Editar
            </button>
            <button class="btn btn-sm btn-danger delete-btn" data-trigger="${trigger}">
              <i class="bi bi-trash-fill"></i> Eliminar
            </button>
            <button class="btn btn-sm btn-info quick-btn" data-trigger="${trigger}">
              <i class="bi bi-lightning-charge-fill"></i> Respuesta Rápida
            </button>
          </td>
        `;
        
        responsesTable.appendChild(row);
      });
      
      // Agregar event listeners a los botones
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.currentTarget.getAttribute('data-trigger');
          const response = responses[trigger];
          
          triggerInput.value = trigger;
          responseInput.value = response;
          addResponseForm.scrollIntoView({ behavior: 'smooth' });
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.currentTarget.getAttribute('data-trigger');
          if (confirm('¿Estás seguro de eliminar esta respuesta?')) {
            toggleLoading(true);
            socket.emit('deleteResponse', trigger);
          }
        });
      });
      
      document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.currentTarget.getAttribute('data-trigger');
          const response = responses[trigger];
          
          // Verificar si ya existe como respuesta rápida
          socket.emit('checkQuickResponse', { trigger }, (exists) => {
            if (exists) {
              showToast('Esta respuesta ya existe como respuesta rápida', 'error');
            } else if (confirm('¿Desea agregar esta respuesta como respuesta rápida?')) {
              socket.emit('addQuickResponse', { trigger, response });
            }
          });
        });
      });
    });

    // Enviar nueva respuesta
    addResponseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const trigger = triggerInput.value.trim().toLowerCase();
      const response = responseInput.value.trim();
      if (trigger && response) {
        toggleLoading(true);
        socket.emit('addResponse', { trigger, response });

        }
    });

    // Confirmar acciones
    socket.on('responseAdded', () => {
      toggleLoading(false);
      showToast('Respuesta guardada correctamente');
      triggerInput.value = '';
      responseInput.value = '';
      socket.emit('getResponses');
    });
    
    socket.on('responseDeleted', () => {
      toggleLoading(false);
      showToast('Respuesta eliminada correctamente');
      socket.emit('getResponses');
    });
    
    socket.on('quickResponseAdded', () => {
      showToast('Respuesta rápida agregada correctamente');
      socket.emit('getResponses');
    });
    
    socket.on('responsesImported', (data) => {
      toggleLoading(false);
      showToast(`${data.count} respuestas importadas correctamente`);
      socket.emit('getResponses');
    });
    
    socket.on('error', (msg) => {
      toggleLoading(false);
      showToast(msg, 'error');
      console.error('Error del servidor:', msg);
    });

    // Escuchar eventos para Console Log
    socket.on('consoleLog', (msg) => {
      const entry = document.createElement('div');
      entry.className = 'console-entry';
      entry.textContent = msg;
      consoleLogDiv.appendChild(entry);
      consoleLogDiv.scrollTop = consoleLogDiv.scrollHeight;
    });

    // Escuchar eventos para Mensajería en tiempo real
    socket.on('botChatMessage', (data) => {
      const entry = document.createElement('div');
      entry.className = 'chat-message ' + (data.from === 'ADMIN' ? 'user-message' : 'bot-message');
      
      entry.innerHTML = `
        <div class="chat-sender">${data.from}</div>
        ${data.message}
      `;
      
      botChatDiv.appendChild(entry);
      botChatDiv.scrollTop = botChatDiv.scrollHeight;
    });

    // Enviar mensaje desde el chat al servidor
    sendChatBtn.addEventListener('click', () => {
      const message = chatInput.value.trim();
      if (message) {
        // Añadir mensaje del usuario al chat
        const entry = document.createElement('div');
        entry.className = 'chat-message user-message';
        entry.innerHTML = `
          <div class="chat-sender">ADMIN</div>
          ${message}
        `;
        botChatDiv.appendChild(entry);
        botChatDiv.scrollTop = botChatDiv.scrollHeight;
        
        socket.emit('adminChatMessage', message);
        chatInput.value = '';
      }
    });
    
    // También permitir enviar con Enter
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatBtn.click();
      }
    });

    // Exportar respuestas
    exportBtn.addEventListener('click', () => {
      toggleLoading(true);
      
      // Usamos una función normal sin callback (para consistencia)
      socket.emit('getResponsesForExport');
      
      // Y escuchamos un evento específico para exportación
      socket.on('responsesForExport', (responses) => {
        toggleLoading(false);
        // Crear un blob con los datos
        const data = JSON.stringify({ responses }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        
        // Crear un enlace para descargar
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respuestas_whatsapp_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        showToast('Respuestas exportadas correctamente');
      });
    });
    
    // Mostrar modal para importar
    importBtn.addEventListener('click', () => {
      const importModal = new bootstrap.Modal(document.getElementById('importModal'));
      importModal.show();
    });
    
    // Importar respuestas
    confirmImportBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('importFile');
      const replaceAll = document.getElementById('replaceResponses').checked;
      
      if (fileInput.files.length === 0) {
        showToast('Por favor selecciona un archivo JSON para importar', 'error');
        return;
      }
      
      const file = fileInput.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (!data.responses) {
            showToast('Formato de archivo incorrecto. No se encontró el objeto "responses".', 'error');
            return;
          }
          
          // Enviamos los datos al servidor
          toggleLoading(true);
          socket.emit('importResponses', {
            responses: data.responses,
            replace: replaceAll
          });
          
          // Cerrar el modal
          const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
          importModal.hide();
        } catch (error) {
          showToast('Error al analizar el archivo JSON: ' + error.message, 'error');
        }
      };
      
      reader.readAsText(file);
    });
    
    // Actualizar respuestas
    refreshBtn.addEventListener('click', () => {
      toggleLoading(true);
      socket.emit('forceReload');
    });
    
    // Limpiar console log
    clearConsoleBtn.addEventListener('click', () => {
      consoleLogDiv.innerHTML = '';
    });
    
    // Limpiar chat
    clearChatBtn.addEventListener('click', () => {
      botChatDiv.innerHTML = '';
    });

    // Mantener la conexión activa
    setInterval(() => {
      socket.emit('ping');
    }, 30000);
  </script>
</body>
</html>`;
  
  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public, { recursive: true });
  }
  
  // Guardar el HTML
  fs.writeFileSync(path.join(config.paths.public, config.files.adminHtml), adminHtmlContent);
  console.log('Archivo admin.html creado correctamente');
}

module.exports = createAdminHtml;