// publisher.js
module.exports.publishToAllGroups = async (whatsappManager, mediaPath, caption) => {
  try {
    // Utilizamos el GroupManager y MediaHandler ya inicializados en whatsappManager
    const groupManager = whatsappManager.groupManager;
    const mediaHandler = whatsappManager.mediaHandler;

    // Obtener todos los grupos
    const groups = await groupManager.getAllGroups();

    // Recorrer cada grupo y enviar el mensaje multimedia
    for (const group of groups) {
      // group.id._serialized es el identificador único del grupo
      await mediaHandler.sendMedia(group.id._serialized, mediaPath, { caption });
    }

    return { success: true, message: "Mensaje enviado a todos los grupos" };
  } catch (error) {
    throw new Error(`Error publicando en grupos: ${error.message}`);
  }
};
