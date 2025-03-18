// ai-handler.js
const { OpenAI } = require('openai');
const config = require('./config');
const utils = require('./utils');

class AIHandler {
  constructor() {
    // Intentar cargar la API key con una mejor verificación
    this.apiKey = process.env.OPENAI_API_KEY || config.openai.apiKey;
    
    // Solo inicializar OpenAI si hay una API key
    if (this.apiKey && this.apiKey.trim() !== '') {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
      
      utils.log(`API key de OpenAI configurada correctamente: ${process.env.OPENAI_API_KEY ? "Desde variables de entorno" : "Desde config"}`, 'success');
      utils.log(`Modelo configurado: ${config.openai.model}`, 'info');
    } else {
      utils.log('No se ha configurado API key de OpenAI. Las respuestas generadas por IA no estarán disponibles.', 'warning');
      this.openai = null;
    }
  }

  async generateResponse(message) {
    try {
      // Verificar si hay API key configurada - SIMPLIFICADO
      if (!this.openai || !this.apiKey || this.apiKey.trim() === '') {
        // Mensaje simplificado que solo redirecciona al privado sin mencionar errores técnicos
        return config.openai.privateMessage;
      }

      // Log detallado para debug
      utils.log(`Generando respuesta con OpenAI para: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`, 'info');
      
      try {
    const completion = await this.openai.chat.completions.create({
  model: config.openai.model,
  messages: [
    { 
      role: "system", 
      content: `Eres un asistente amable para un negocio.
          Tus respuestas deben ser cortas, naturales y conversacionales.
          
          Instrucciones:
          - Usa un tono amigable y personal como un buen amigo
          - Responde directamente a lo que dice el cliente sin frases genéricas
          - Usa máximo 2 oraciones por respuesta
          - Incluye un emoji ocasional para ser amigable (máximo 1 por respuesta)
          - NO menciones que eres un asistente o bot
          - NO redirecciones al cliente a un número privado a menos que sea necesario
          - Sólo menciona el número 4961260597 si el cliente pregunta específicamente por contacto
          - Para preguntas sobre productos, precios o consultas específicas, responde con naturalidad
          - Mantén las respuestas breves y al punto
          - Si el cliente se despide o agradece, simplemente responde de forma amable y breve`
    },
    { role: "user", content: message }
  ],
  max_tokens: config.openai.maxTokens,
  temperature: config.openai.temperature,
});

        let aiResponse = completion.choices[0].message.content.trim();
        
        // Si está configurado para siempre redireccionar al privado
     // Sólo añadir el mensaje de redirección si es una consulta compleja
// o si el cliente solicita específicamente contactar a alguien
if (config.openai.privateRedirect && 
    (message.toLowerCase().includes('catálogo') || 
     message.toLowerCase().includes('precio') || 
     message.toLowerCase().includes('hablar con un asesor') ||
     message.toLowerCase().includes('hablar con una persona'))) {
  // Verificar si la respuesta ya incluye el número privado para evitar duplicación
  if (!aiResponse.includes(config.openai.privateNumber)) {
    aiResponse += `\n\n${config.openai.privateMessage}`;
  }
}
        
        utils.log(`Respuesta generada: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`, 'success');
        return aiResponse;
      } catch (apiError) {
        utils.log(`Error en la llamada a la API de OpenAI: ${apiError.message}`, 'error');
        if (apiError.message && apiError.message.includes('API key')) {
          utils.log('Problema con la API key. Verifica que sea válida y esté activa.', 'error');
        }
        // Simplificado para solo devolver el mensaje de redirección en caso de error
        return config.openai.privateMessage;
      }
    } catch (error) {
      utils.log(`Error al generar respuesta con OpenAI: ${error.message}`, 'error');
      // Simplificado para solo devolver el mensaje de redirección en caso de error
      return config.openai.privateMessage;
    }
  }
}

module.exports = new AIHandler();