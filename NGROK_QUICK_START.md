# 🚀 NGROK - Guía Rápida

## PASO 1: Descargar Proyecto en tu PC
```bash
git clone https://github.com/javo-mauro/Kittyapp_Django_v1.git
cd Kittyapp_Django_v1
npm install
```

## PASO 2: Instalar ngrok
- Ve a: https://ngrok.com/download
- Descarga para tu sistema
- Descomprime y coloca ngrok en una carpeta accesible

## PASO 3: Cuenta ngrok (Gratis)
- Regístrate en: https://dashboard.ngrok.com/signup
- Obtén tu authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
- Configura: `ngrok config add-authtoken TU_AUTHTOKEN`

## PASO 4: Ejecutar Aplicación
```bash
# Terminal 1: Aplicación
npm run dev
```

## PASO 5: Crear Túnel
```bash
# Terminal 2: Túnel ngrok
ngrok http 5000
```

Ngrok te dará una URL como: `https://12345abc.ngrok.io`

## PASO 6: Actualizar URLs
Edita `client/src/lib/environment.ts`:

**Cambia estas líneas:**
```typescript
// Línea ~15: 
return 'https://12345abc.ngrok.io'; // TU URL DE NGROK

// Línea ~28:
return 'wss://12345abc.ngrok.io/ws'; // TU URL DE NGROK CON WSS
```

## PASO 7: Construir APK
```bash
npm run build
npx cap copy android && npx cap sync android
npx cap open android
```

## PASO 8: Generar APK
En Android Studio:
1. Build → Generate Signed Bundle / APK
2. Seleccionar APK
3. Generar y instalar en tu teléfono

¡Listo! Tu APK ahora se conectará a través de ngrok.

## URLs de Ejemplo
- Reemplaza `12345abc` con tu código real de ngrok
- Usa HTTPS para API y WSS para WebSocket
- Mantén ambas terminales abiertas