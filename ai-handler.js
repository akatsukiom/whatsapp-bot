// ai-handler.js
const { OpenAI } = require('openai');
const config = require('./config');

class AIHandler {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  async generateResponse(message) {
    try {
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
        aiResponse += `\n\n${config.openai.privateMessage}`;
      }
      
      return aiResponse;
    } catch (error) {
      console.error('Error al generar respuesta con OpenAI:', error);
      return `Lo siento, no pude procesar tu consulta. ${config.openai.privateMessage}`;
    }
  }
}

module.exports = new AIHandler();