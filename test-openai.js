// test-openai.js
// Script para probar la conexión con OpenAI
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

// Cargar variables de entorno
dotenv.config();

async function testOpenAI() {
  console.log('Iniciando prueba de conexión con OpenAI...');
  console.log('Verificando configuración:');
  console.log('- OPENAI_API_KEY está configurada:', process.env.OPENAI_API_KEY ? 'Sí' : 'No');
  console.log('- OPENAI_MODEL está configurado:', process.env.OPENAI_MODEL || 'No (se usará el valor por defecto)');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: No se encontró la API key de OpenAI en las variables de entorno.');
    console.error('Por favor, crea un archivo .env en la raíz del proyecto con el siguiente contenido:');
    console.error('OPENAI_API_KEY=tu_api_key_aquí');
    console.error('OPENAI_MODEL=gpt-3.5-turbo');
    return;
  }
  
  try {
    // Inicializar cliente de OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('Realizando una solicitud de prueba a OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: "system", content: "Eres un asistente útil que responde de forma concisa." },
        { role: "user", content: "Responde con un simple 'Conexión exitosa con OpenAI'" }
      ],
      max_tokens: 50
    });
    
    console.log('✅ Respuesta recibida de OpenAI:');
    console.log(completion.choices[0].message.content);
    console.log('La conexión con OpenAI funciona correctamente.');
    
  } catch (error) {
    console.error('❌ ERROR al conectar con OpenAI:');
    console.error(error.message);
    
    if (error.message.includes('API key')) {
      console.error('El problema parece estar relacionado con la API key. Verifica que sea válida y esté activa.');
    } else if (error.message.includes('network')) {
      console.error('Parece haber un problema de conexión a Internet. Verifica tu conexión.');
    }
  }
}

testOpenAI();