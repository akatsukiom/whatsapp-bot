# WhatsApp Bot Manager

Un sistema automatizado para gestionar múltiples cuentas de WhatsApp con respuestas automáticas y aprendizaje progresivo.

## Características

- 🔄 **Rotación de cuentas**: Cambio automático entre números en caso de baneo
- 🧠 **Aprendizaje progresivo**: Enseña al bot nuevas respuestas directamente desde WhatsApp
- 📱 **Interfaz web**: Escaneo de códigos QR a través de una interfaz web accesible
- 🖼️ **Soporte multimedia**: Manejo básico de imágenes, videos y otros archivos
- ☁️ **Desplegable en la nube**: Listo para desplegar en Railway

## Requisitos

- Node.js 14 o superior
- Cuenta en GitHub
- Cuenta en Railway

## Instrucciones para instalación local

1. Clonar el repositorio:
```bash
git clone https://github.com/akatsukim/whatsapp-bot.git
cd whatsapp-bot
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar la aplicación:
```bash
npm start
```

4. Acceder a la interfaz web:
- Abre tu navegador y visita: `http://localhost:3000`
- Escanea los códigos QR con WhatsApp para conectar tus cuentas

## Comandos disponibles en WhatsApp

- `!learn pregunta | respuesta` - Enseña al bot una nueva respuesta
- `!switch número` - Cambia a una cuenta específica (0, 1, 2, etc.)
- `!status` - Muestra el estado actual de todas las cuentas

## Despliegue en Railway

1. Crear una cuenta en Railway: [railway.app](https://railway.app/)
2. Conecta tu repositorio de GitHub
3. Selecciona tu repositorio en Railway
4. Railway detectará automáticamente el proyecto Node.js
5. Haz clic en "Deploy" y espera a que el despliegue termine
6. Una vez desplegado, Railway te proporcionará una URL para acceder a tu aplicación

## Personalización

### Agregar números de administrador

Edita el archivo `index.js` y busca la función `isAdminMessage`:

```javascript
// Verificar si un mensaje es de un administrador
isAdminMessage(message) {
  // Lista de números de administradores que pueden controlar el bot
  const adminNumbers = ['52xxxxxxxxxx@c.us']; // Reemplazar con tu número
  return adminNumbers.includes(message.from) && message.body.startsWith('!');
}
```

Reemplaza `52xxxxxxxxxx` con tu número de teléfono completo (incluido código de país).

### Configurar cuentas de WhatsApp

Al final del archivo `index.js`, encuentra la función `main()` y edita las líneas:

```javascript
// Agregar algunas cuentas (reemplaza con tus números)
manager.addAccount('5212345678901', 'cuenta_principal');
manager.addAccount('5209876543210', 'cuenta_respaldo');
```

## Solución de problemas

- **Error: Authentication Failure**: Revisa que el código QR haya sido escaneado correctamente
- **Error: Browser Timeout**: Aumenta los recursos en Railway (memoria/CPU)
- **Error: Session expired**: Vuelve a escanear el código QR

## Consideraciones importantes

- WhatsApp puede detectar bots y banear cuentas, usa esta herramienta con moderación
- No utilices números principales/importantes para evitar baneo permanente
- Se recomienda usar este sistema solo para atención al cliente o propósitos legítimos

## Licencia

Este proyecto está bajo licencia MIT.