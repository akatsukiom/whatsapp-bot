// Plantilla para la página de administración
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
  <style>
    body { 
      padding: 20px;
      background-color: #f7f7f7;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .admin-panel {
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    .response-table {
      margin-top: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .header-container {
      background-color: #075e54;
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      display: none;
    }
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1100;
    }
    /* Estilos para la mini consola */
    #consoleLog {
      height: 200px;
      overflow-y: scroll;
      border: 1px solid #ccc;
      padding: 10px;
      background: #f8f9fa;
    }
    /* Estilos para el chat en tiempo real */
    #botChat {
      height: 300px;
      overflow-y: scroll;
      border: 1px solid #ccc;
      padding: 10px;
      background: #fff;
    }
  </style>
</head>
<body>
  <!-- Overlay de carga -->
  <div id="loadingOverlay" class="loading-overlay">
    <div class="spinner-border text-success" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
  </div>

  <!-- Contenedor de notificaciones -->
  <div class="toast-container" id="toastContainer"></div>

  <div class="container">
    <div class="header-container">
      <h1 class="text-center mb-0"><i class="bi bi-whatsapp me-2"></i>Panel de Administración</h1>
    </div>
    
    <div class="row">
      <div class="col-12 text-center mb-4">
        <a href="/" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-2"></i>Volver a la página principal
        </a>
        <button id="reloadBtn" class="btn btn-info ms-2">
          <i class="bi bi-arrow-clockwise me-2"></i>Recargar respuestas
        </button>
      </div>
    </div>
    
    <!-- Panel de agregar respuestas -->
    <div class="row">
      <div class="col-md-12">
        <div class="admin-panel">
          <h3><i class="bi bi-plus-circle me-2"></i>Agregar nueva respuesta</h3>
          <form id="addResponseForm">
            <div class="form-group">
              <label for="trigger">Cuando el usuario escriba:</label>
              <input type="text" class="form-control" id="trigger" placeholder="Ej: hola, información, precios, etc." required>
            </div>
            <div class="form-group">
              <label for="response">El bot responderá:</label>
              <textarea class="form-control" id="response" rows="3" placeholder="Escribe la respuesta que dará el bot..." required></textarea>
            </div>
            <button type="submit" class="btn btn-success">
              <i class="bi bi-save me-2"></i>Guardar respuesta
            </button>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Tabla de respuestas existentes -->
    <div class="row">
      <div class="col-md-12">
        <div class="admin-panel response-table">
          <h3><i class="bi bi-list-check me-2"></i>Respuestas configuradas</h3>
          <div class="table-responsive">
            <table class="table table-striped">
              <thead class="table-dark">
                <tr>
                  <th>Cuando el usuario escriba</th>
                  <th>El bot responderá</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="responsesTable">
                <!-- Las respuestas se cargarán aquí -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Panel de Console Log en tiempo real -->
    <div class="row">
      <div class="col-md-12">
        <div class="admin-panel">
          <h3><i class="bi bi-terminal me-2"></i>Console Log</h3>
          <div id="consoleLog">
            <!-- Se mostrarán mensajes de log en tiempo real -->
          </div>
        </div>
      </div>
    </div>
    
    <!-- Panel de Mensajería en Tiempo Real -->
    <div class="row">
      <div class="col-md-12">
        <div class="admin-panel">
          <h3><i class="bi bi-chat-dots me-2"></i>Mensajería en Tiempo Real</h3>
          <div id="botChat">
            <!-- Se mostrarán los mensajes de chat -->
          </div>
          <div class="input-group mt-2">
            <input type="text" id="chatInput" class="form-control" placeholder="Escribe un mensaje para el bot...">
            <button id="sendChatBtn" class="btn btn-primary">Enviar</button>
          </div>
        </div>
      </div>
    </div>
    
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Conectar a Socket.IO
    const socket = io();
    
    // Elementos del DOM para respuestas y notificaciones
    const addResponseForm = document.getElementById('addResponseForm');
    const triggerInput = document.getElementById('trigger');
    const responseInput = document.getElementById('response');
    const responsesTable = document.getElementById('responsesTable');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toastContainer = document.getElementById('toastContainer');

    // Elementos para Console Log y Chat
    const consoleLogDiv = document.getElementById('consoleLog');
    const botChatDiv = document.getElementById('botChat');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');

    // Función para mostrar/ocultar overlay de carga
    function toggleLoading(show) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    // Función para mostrar notificaciones
    function showToast(message, type = 'success') {
      const toastId = 'toast-' + Date.now();
      const toastHtml = \`
        <div id="\${toastId}" class="toast align-items-center text-white bg-\${type === 'success' ? 'success' : 'danger'}" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi bi-\${type === 'success' ? 'check-circle' : 'exclamation-circle'}-fill me-2"></i>
              \${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      \`;
      
      toastContainer.insertAdjacentHTML('beforeend', toastHtml);
      const toastElement = document.getElementById(toastId);
      
      // Mostrar el toast
      toastElement.classList.add('show');
      
      // Remover después de 5 segundos
      setTimeout(() => {
        if (toastElement && toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 5000);
    }
    
    // Cargar respuestas existentes al iniciar
    toggleLoading(true);
    socket.emit('getResponses');
    
    // Recibir respuestas del servidor
    socket.on('responsesList', (responses) => {
      toggleLoading(false);
      responsesTable.innerHTML = '';
      
      if (!responses || Object.keys(responses).length === 0) {
        responsesTable.innerHTML = '<tr><td colspan="3" class="text-center">No hay respuestas configuradas</td></tr>';
        return;
      }
      
      for (const [trigger, response] of Object.entries(responses)) {
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td>\${trigger}</td>
          <td>\${response}</td>
          <td>
            <button class="btn btn-sm btn-warning edit-btn" data-trigger="\${trigger}">
              <i class="bi bi-pencil-fill"></i> Editar
            </button>
            <button class="btn btn-sm btn-danger delete-btn" data-trigger="\${trigger}">
              <i class="bi bi-trash-fill"></i> Eliminar
            </button>
          </td>
        \`;
        responsesTable.appendChild(row);
      }
      
      // Agregar event listeners a los botones de editar y eliminar
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.target.closest('.edit-btn').getAttribute('data-trigger');
          const response = responses[trigger];
          triggerInput.value = trigger;
          responseInput.value = response;
          addResponseForm.scrollIntoView({ behavior: 'smooth' });
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.target.closest('.delete-btn').getAttribute('data-trigger');
          if (confirm('¿Estás seguro de eliminar esta respuesta?')) {
            toggleLoading(true);
            socket.emit('deleteResponse', trigger);
          }
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
    
    // Botón de recarga forzada
    document.getElementById('reloadBtn').addEventListener('click', () => {
      toggleLoading(true);
      socket.emit('forceReload');
      console.log('Solicitando recarga forzada de respuestas');
    });
    
    // Confirmar acciones de agregar o eliminar respuestas
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
    
    socket.on('error', (msg) => {
      toggleLoading(false);
      showToast(msg, 'error');
      console.error('Error del servidor:', msg);
    });
    
    // Actualización en tiempo real de Console Log
    socket.on('consoleLog', (msg) => {
      const entry = document.createElement('div');
      entry.textContent = msg;
      consoleLogDiv.appendChild(entry);
      consoleLogDiv.scrollTop = consoleLogDiv.scrollHeight;
    });
    
    // Actualización en tiempo real de Mensajería (chat)
    socket.on('botChatMessage', (data) => {
      const entry = document.createElement('div');
      entry.innerHTML = \`<strong>\${data.from}:</strong> \${data.message}\`;
      botChatDiv.appendChild(entry);
      botChatDiv.scrollTop = botChatDiv.scrollHeight;
    });
    
    // Enviar mensaje desde el chat al servidor (para que el admin enseñe al bot, por ejemplo)
    sendChatBtn.addEventListener('click', () => {
      const message = chatInput.value.trim();
      if (message) {
        socket.emit('adminChatMessage', message);
        chatInput.value = '';
      }
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
  
  // Guardar el HTML de administración
  fs.writeFileSync(path.join(config.paths.public, config.files.adminHtml), adminHtmlContent);
  console.log('Archivo admin.html creado correctamente');
}

module.exports = createAdminHtml;
