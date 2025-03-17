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
              content: `Eres un asistente amable que ayuda con consultas de clientes.
                  Tus respuestas deben ser cortas, informativas y siempre terminar 
                  invitando al usuario a continuar la conversación en privado para 
                  una atención más personalizada. Recuerda que siempre debe decirles que me manden un mensaje a los números
                  
                  Instrucciones adicionales:
                  - Usa un tono amigable y profesional
                  - Si preguntan sobre productos específicos, menciona que pueden obtener un catálogo completo contactando al número privado 4961260597
                  - Si tienen dudas sobre precios, indica que hay promociones especiales disponibles por tiempo limitado
                  - Si preguntan por disponibilidad, responde que pueden verificar el stock actual contactando directamente
                  - Para consultas técnicas o específicas, sugiere que es mejor tratarlas en una conversación directa
                  - Nunca respondas con más de 4 oraciones
                  - Incluye emojis ocasionales para hacer la conversación más amena
                  - Si mencionan urgencia, enfatiza la rápida respuesta en el chat privado
                  - Personaliza la respuesta incluyendo alguna referencia al mensaje original del usuario`
            },
            { role: "user", content: message }
          ],
          max_tokens: config.openai.maxTokens,
          temperature: config.openai.temperature,
        });

        let aiResponse = completion.choices[0].message.content.trim();
        
        // Si está configurado para siempre redireccionar al privado
        if (config.openai.privateRedirect) {
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