// templates/admin-template.js
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
    /* Estilos para el Console Log y Chat */
    #consoleLog, #botChat {
      height: 250px;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      background: #f8f9fa;
    }
    .btn-action-group {
      margin-bottom: 15px;
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
    <!-- Encabezado -->
    <div class="header-container">
      <h1 class="text-center mb-0">
        <i class="bi bi-whatsapp me-2"></i>Panel de Administración
      </h1>
    </div>
    
    <!-- Formulario para agregar nueva respuesta -->
    <div class="admin-panel">
      <h3><i class="bi bi-plus-circle me-2"></i>Agregar nueva respuesta</h3>
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
          <i class="bi bi-save me-2"></i>Guardar respuesta
        </button>
      </form>
    </div>
    
    <!-- Paneles en línea: Console Log y Mensajería en Tiempo Real -->
    <div class="row">
      <div class="col-md-6">
        <div class="admin-panel">
          <h3><i class="bi bi-terminal me-2"></i>Console Log</h3>
          <div id="consoleLog"></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="admin-panel">
          <h3><i class="bi bi-chat-dots me-2"></i>Mensajería en Tiempo Real</h3>
          <div id="botChat"></div>
          <div class="input-group mt-2">
            <input type="text" id="chatInput" class="form-control" placeholder="Escribe un mensaje para el bot...">
            <button id="sendChatBtn" class="btn btn-primary">Enviar</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Panel de Respuestas Configuradas -->
    <div class="admin-panel">
      <h3><i class="bi bi-list-check me-2"></i>Respuestas configuradas</h3>
      <div class="btn-action-group">
        <div class="btn-group">
          <button id="exportResponses" class="btn btn-info">
            <i class="bi bi-download me-1"></i> Exportar respuestas
          </button>
          <button id="importResponses" class="btn btn-success">
            <i class="bi bi-upload me-1"></i> Importar respuestas
          </button>
          <button id="refreshResponses" class="btn btn-primary">
            <i class="bi bi-arrow-clockwise me-1"></i> Actualizar respuestas
          </button>
        </div>
      </div>
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
            <!-- Se cargarán las respuestas -->
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Panel de configuración de IA -->
    <div class="admin-panel">
      <h3><i class="bi bi-robot me-2"></i>Configuración de IA (OpenAI)</h3>
      <form id="aiConfigForm">
        <div class="mb-3">
          <label for="openaiApiKey" class="form-label">API Key de OpenAI</label>
          <input type="password" class="form-control" id="openaiApiKey" placeholder="sk-...">
        </div>
        <div class="mb-3">
          <label for="aiModel" class="form-label">Modelo</label>
          <select class="form-select" id="aiModel">
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="privateMessage" class="form-label">Mensaje de redirección al privado</label>
          <textarea class="form-control" id="privateMessage" rows="2"></textarea>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="alwaysRedirect" checked>
          <label class="form-check-label" for="alwaysRedirect">
            Siempre redirigir al privado
          </label>
        </div>
        <button type="submit" class="btn btn-primary">Guardar configuración</button>
      </form>
    </div>
  </div>

  <!-- Modal para importar respuestas -->
  <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="importModalLabel">Importar respuestas</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
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
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-primary" id="confirmImport">Importar</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Conectar a Socket.IO con opciones mejoradas
    const socket = io({
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });
    
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
    
    // Inicializar modal para importar
    const importModal = new bootstrap.Modal(document.getElementById('importModal'));
    
    // Función para mostrar/ocultar overlay de carga
    function toggleLoading(show) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // Función para mostrar notificaciones (toast)
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
      document.getElementById('openaiApiKey').value = config.apiKey;
      document.getElementById('aiModel').value = config.model;
      document.getElementById('privateMessage').value = config.privateMessage;
      document.getElementById('alwaysRedirect').checked = config.privateRedirect;
    });

    // Enviar actualización de configuración de IA
    document.getElementById('aiConfigForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const config = {
        apiKey: document.getElementById('openaiApiKey').value,
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
      showToast('Configuración de IA actualizada', 'success');
    });

    // Cargar respuestas existentes
    toggleLoading(true);
    socket.emit('getResponses');
    
    socket.on('responsesList', (responses) => {
      toggleLoading(false);
      responsesTable.innerHTML = '';
      if (!responses || Object.keys(responses).length === 0) {
        responsesTable.innerHTML = '<tr><td colspan="3" class="text-center">No hay respuestas configuradas</td></tr>';
        return;
      }
      for (const [trigger, response] of Object.entries(responses)) {
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
      }
      
      // Agregar event listeners a los botones
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
      
      document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.target.closest('.quick-btn').getAttribute('data-trigger');
          const response = responses[trigger];
          if (confirm('¿Desea agregar esta respuesta como respuesta rápida?')) {
            socket.emit('addQuickResponse', { trigger, response });
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
      showToast('Respuesta rápida agregada correctamente', 'success');
      socket.emit('getResponses');
    });
    
    socket.on('responsesImported', (data) => {
      toggleLoading(false);
      showToast(`${data.count} respuestas importadas correctamente`, 'success');
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
      entry.textContent = msg;
      consoleLogDiv.appendChild(entry);
      consoleLogDiv.scrollTop = consoleLogDiv.scrollHeight;
    });

    // Escuchar eventos para Mensajería en tiempo real
    socket.on('botChatMessage', (data) => {
      const entry = document.createElement('div');
      entry.innerHTML = `<strong>${data.from}:</strong> ${data.message}`;
      botChatDiv.appendChild(entry);
      botChatDiv.scrollTop = botChatDiv.scrollHeight;
    });

    // Enviar mensaje desde el chat al servidor
    sendChatBtn.addEventListener('click', () => {
      const message = chatInput.value.trim();
      if (message) {
        socket.emit('adminChatMessage', message);
        // También agregar el mensaje a la interfaz
        const entry = document.createElement('div');
        entry.innerHTML = `<strong>Tú:</strong> ${message}`;
        botChatDiv.appendChild(entry);
        botChatDiv.scrollTop = botChatDiv.scrollHeight;
        // Limpiar campo de entrada
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
      socket.emit('getResponses', (responses) => {
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

    // Eventos de conexión
    socket.on('connect', () => {
      showToast('Conectado al servidor', 'success');
    });
    
    socket.on('disconnect', () => {
      showToast('Desconectado del servidor. Intentando reconectar...', 'error');
    });
    
    socket.on('reconnect', () => {
      showToast('Reconectado al servidor', 'success');
      socket.emit('getResponses');
    });

    // Mantener la conexión activa con un ping regular
    setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
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