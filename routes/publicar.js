const express = require('express');
const router = express.Router();
const { publishToAllGroups } = require('../publisher');

// Esta ruta POST se usará para publicar en todos los grupos
router.post('/publicar', async (req, res) => {
  try {
    // Se espera recibir mediaPath (puede ser una URL o ruta local) y caption (el texto del mensaje)
    const { mediaPath, caption } = req.body;
    
    // Usamos la instancia global del WhatsAppManager, que debiste haber inicializado previamente
    if (!global.whatsappManager) {
      return res.status(500).json({ success: false, error: "WhatsApp Manager no está inicializado" });
    }

    const result = await publishToAllGroups(global.whatsappManager, mediaPath, caption);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
