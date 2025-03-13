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
  </style>
</head>
<body>
  <div class="container">
    <div class="header-container">
      <h1 class="text-center mb-0"><i class="bi bi-whatsapp me-2"></i>Panel de Administración</h1>
    </div>
    
    <div class="row">
      <div class="col-12 text-center mb-4">
        <a href="/" class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-2"></i>Volver a la página principal
        </a>
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
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    // Conectar a Socket.IO
    const socket = io();
    
    // Elementos del DOM
    const addResponseForm = document.getElementById('addResponseForm');
    const triggerInput = document.getElementById('trigger');
    const responseInput = document.getElementById('response');
    const responsesTable = document.getElementById('responsesTable');
    
    // Cargar respuestas existentes al iniciar
    socket.emit('getResponses');
    
    // Recibir respuestas del servidor
    socket.on('responsesList', (responses) => {
      responsesTable.innerHTML = '';
      
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
      
      // Agregar event listeners a los botones
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const trigger = e.target.getAttribute('data-trigger');
          const response = responses[trigger];
          
          triggerInput.value = trigger;
          responseInput.value = response;
          
          // Scroll hacia el formulario
          addResponseForm.scrollIntoView({ behavior: 'smooth' });
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (confirm('¿Estás seguro de eliminar esta respuesta?')) {
            const trigger = e.target.getAttribute('data-trigger');
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
        socket.emit('addResponse', { trigger, response });
        
        // Limpiar formulario
        triggerInput.value = '';
        responseInput.value = '';
      }
    });
    
    // Confirmar acciones
    socket.on('responseAdded', () => {
      alert('Respuesta guardada correctamente');
      socket.emit('getResponses');
    });
    
    socket.on('responseDeleted', () => {
      alert('Respuesta eliminada correctamente');
      socket.emit('getResponses');
    });
    
    socket.on('error', (msg) => {
      alert('Error: ' + msg);
    });
  </script>
</body>
</html>`;

  // Crear carpeta public si no existe
  if (!fs.existsSync(config.paths.public)) {
    fs.mkdirSync(config.paths.public);
  }
  
  // Guardar el HTML de administración
  fs.writeFileSync(path.join(config.paths.public, config.files.adminHtml), adminHtmlContent);
  console.log('Archivo admin.html creado correctamente');
}

module.exports = createAdminHtml;