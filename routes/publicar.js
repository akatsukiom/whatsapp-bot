// routes/publicar.js
const express = require('express');
const router = express.Router();
const { publishToAllGroups } = require('../modules/publisher');
const logger = require('../modules/utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para la subida de archivos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Crear directorio uploads si no existe
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Generar nombre único con timestamp
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});

// Filtro para aceptar solo imágenes y videos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Formato no soportado. Solo se permiten imágenes y videos.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  }
});

// Esta ruta POST se usará para publicar en todos los grupos con una URL o ruta
router.post('/publicar', async (req, res) => {
  try {
    // Se espera recibir mediaPath (puede ser una URL o ruta local) y caption (el texto del mensaje)
    const { mediaPath, caption } = req.body;
    
    if (!mediaPath) {
      return res.status(400).json({ success: false, error: "Debe proporcionar una ruta o URL para el archivo multimedia" });
    }
    
    logger.info(`Solicitud recibida para publicar en grupos: ${mediaPath}`);
    
    // Usamos la instancia global del WhatsAppManager
    if (!global.whatsappManager) {
      logger.error("WhatsApp Manager no está inicializado");
      return res.status(500).json({ success: false, error: "WhatsApp Manager no está inicializado" });
    }

    const result = await publishToAllGroups(global.whatsappManager, mediaPath, caption);
    
    if (!result.success) {
      logger.error(`Error en la publicación: ${result.error}`);
      return res.status(500).json(result);
    }
    
    logger.info(`Publicación completada: ${result.message}`);
    res.json(result);
  } catch (error) {
    logger.error(`Error al procesar solicitud de publicación: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para subir archivo y publicar
router.post('/upload-and-publish', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No se ha proporcionado ningún archivo" });
    }
    
    const { caption } = req.body;
    const filePath = req.file.path;
    
    logger.info(`Archivo subido correctamente: ${filePath}`);
    
    // Usar la instancia global del WhatsAppManager para publicar
    if (!global.whatsappManager) {
      logger.error("WhatsApp Manager no está inicializado");
      
      // Si hay error, eliminar el archivo subido
      fs.unlink(filePath, (err) => {
        if (err) logger.error(`Error al eliminar archivo temporal: ${err.message}`);
      });
      
      return res.status(500).json({ success: false, error: "WhatsApp Manager no está inicializado" });
    }

    const result = await publishToAllGroups(global.whatsappManager, filePath, caption);
    
    if (!result.success) {
      // Si hay error, eliminar el archivo subido
      fs.unlink(filePath, (err) => {
        if (err) logger.error(`Error al eliminar archivo temporal: ${err.message}`);
      });
      
      logger.error(`Error en la publicación: ${result.error}`);
      return res.status(500).json(result);
    }
    
    logger.info(`Publicación con archivo subido completada: ${result.message}`);
    res.json(result);
  } catch (error) {
    logger.error(`Error al procesar solicitud de subida y publicación: ${error.message}`);
    
    // Si hay un archivo subido, intentar eliminarlo
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error(`Error al eliminar archivo temporal: ${err.message}`);
      });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta GET para mostrar la página de publicación
router.get('/publicar', (req, res) => {
  res.sendFile('publicar.htm', { root: './public' });
});

module.exports = router;