// ai-handler.js
const { OpenAI } = require('openai');
const config = require('./config');
const utils = require('./utils');

class AIHandler {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || config.openai.apiKey
    });
    
    // Validar si hay una API key configurada
    if (!this.openai.apiKey) {
      utils.log('No se ha configurado API key de OpenAI. Las respuestas generadas por IA no estarán disponibles.', 'warning');
    }
  }

  async generateResponse(message) {
    try {
      // Verificar si hay API key configurada
      if (!this.openai.apiKey) {
        return `Lo siento, no puedo procesar tu consulta porque no se ha configurado la integración con OpenAI. ${config.openai.privateMessage}`;
      }

      utils.log(`Generando respuesta con OpenAI para: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`, 'info');
      
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { 
            role: "system", 
            content: `Eres un asistente amable que ayuda con consultas de clientes. 
                      Tus respuestas deben ser cortas, informativas y siempre terminar 
                      invitando al usuario a continuar la conversación en privado para 
                      una atención más personalizada.`
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
    } catch (error) {
      utils.log(`Error al generar respuesta con OpenAI: ${error.message}`, 'error');
      return `Lo siento, no pude procesar tu consulta. ${config.openai.privateMessage}`;
    }
  }
}

module.exports = new AIHandler();