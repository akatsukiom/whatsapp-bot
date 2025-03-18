// routes/publicar.js
const express = require('express');
const router = express.Router();
const { publishToAllGroups } = require('../modules/publisher');
const logger = require('../modules/utils/logger');

// Esta ruta POST se usará para publicar en todos los grupos
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

// Ruta GET para mostrar la página de publicación
router.get('/publicar', (req, res) => {
  res.sendFile('publicar.htm', { root: './public' });
});

module.exports = router;