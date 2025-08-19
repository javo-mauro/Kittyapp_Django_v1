# Configuración de ngrok para APK - Guía Paso a Paso

## ¿Qué es ngrok?
ngrok crea un túnel seguro desde internet hacia tu aplicación local, permitiendo que la APK se conecte desde cualquier dispositivo móvil.

## Pasos de Instalación y Configuración

### 1. DESCARGAR EL PROYECTO EN TU PC
```bash
# Clonar el repositorio actualizado
git clone https://github.com/javo-mauro/Kittyapp_Django_v1.git

# Entrar al directorio
cd Kittyapp_Django_v1

# Instalar dependencias
npm install
```

### 2. INSTALAR NGROK
**Opción A: Descargar desde el sitio oficial**
- Ve a: https://ngrok.com/download
- Descarga para tu sistema operativo (Windows/Mac/Linux)
- Descomprime y mueve ngrok a una carpeta accesible

**Opción B: Usando package managers**
```bash
# Windows (con Chocolatey)
choco install ngrok

# Mac (con Homebrew)
brew install ngrok

# Linux (con snap)
sudo snap install ngrok
```

### 3. CREAR CUENTA EN NGROK (GRATIS)
- Ve a: https://dashboard.ngrok.com/signup
- Regístrate gratis
- Obtén tu authtoken desde: https://dashboard.ngrok.com/get-started/your-authtoken

### 4. CONFIGURAR NGROK
```bash
# Configurar tu authtoken (solo una vez)
ngrok config add-authtoken TU_AUTHTOKEN_AQUI
```

### 5. EJECUTAR LA APLICACIÓN
```bash
# En una terminal, ejecutar la aplicación
npm run dev
```
La aplicación debería estar corriendo en http://localhost:5000

### 6. CREAR TÚNEL CON NGROK
```bash
# En OTRA terminal, crear el túnel público
ngrok http 5000
```

Ngrok te mostrará algo así:
```
Session Status                online
Account                       tu-email@example.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123def.ngrok.io -> http://localhost:5000
Forwarding                    http://abc123def.ngrok.io -> http://localhost:5000
```

### 7. ACTUALIZAR URLS EN EL CÓDIGO
Copia la URL HTTPS de ngrok (ej: https://abc123def.ngrok.io) y actualiza el archivo:

**Editar: `client/src/lib/environment.ts`**
```typescript
export function getReplitUrl(): string {
  // Cambiar esta línea con tu URL de ngrok
  return 'https://abc123def.ngrok.io';  // ← TU URL DE NGROK AQUÍ
}

export function getWebSocketUrl(): string {
  if (isCapacitor()) {
    return 'wss://abc123def.ngrok.io/ws';  // ← TU URL DE NGROK AQUÍ
  }
  // ... resto del código
}
```

### 8. RECONSTRUIR LA APK
```bash
# Construir la aplicación
npm run build

# Preparar Android
npx cap copy android && npx cap sync android

# Abrir Android Studio para generar APK
npx cap open android
```

### 9. GENERAR APK EN ANDROID STUDIO
1. En Android Studio: Build → Generate Signed Bundle / APK
2. Seleccionar "APK"
3. Crear un keystore o usar uno existente
4. Build APK

### 10. PROBAR LA APK
- Instala la APK en tu teléfono
- La aplicación ahora se conectará a tu servidor local a través del túnel de ngrok
- Podrás hacer login y usar todas las funciones

## Notas Importantes

### URLs Dinámicas
- La URL de ngrok cambia cada vez que reinicias ngrok (versión gratuita)
- Para URLs fijas necesitas ngrok Pro

### Mantener Activo
- Mantén ambas terminales abiertas:
  1. Terminal con `npm run dev` (servidor)
  2. Terminal con `ngrok http 5000` (túnel)

### Firewall
- Asegúrate de que tu firewall permita las conexiones en puerto 5000

## Troubleshooting

**Error: "command not found: ngrok"**
- Asegúrate de que ngrok esté en tu PATH
- O usa la ruta completa: `./ngrok http 5000`

**Error de conexión en APK**
- Verifica que uses HTTPS (no HTTP) en las URLs
- Confirma que ambos servicios estén corriendo
- Revisa los logs en la terminal

**APK no conecta**
- Verifica que el teléfono tenga internet
- Asegúrate de usar la URL correcta de ngrok
- Revisa que el túnel esté activo