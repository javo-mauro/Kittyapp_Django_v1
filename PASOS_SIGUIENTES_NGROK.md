# Pasos Siguientes - Después de Instalar ngrok

## ESTADO ACTUAL:
✅ Aplicación local funcionando en localhost:5000
✅ Base de datos conectada
✅ Login funcionando (jdayne3/jdayne3)
✅ Authtoken de ngrok disponible: 31UFEGTVLGUv1xD23fX2kjozYaB_5ctz4VXHt4Ebx1Xcn3zkp

## SIGUIENTE PASO:

### 1. Instalar ngrok
- Descarga: https://ngrok.com/download (Windows 64-bit)
- Extrae y coloca en una carpeta accesible

### 2. Configurar ngrok
```powershell
# Desde donde extracte ngrok, o si está en PATH:
ngrok config add-authtoken 31UFEGTVLGUv1xD23fX2kjozYaB_5ctz4VXHt4Ebx1Xcn3zkp
```

### 3. Crear túnel (NUEVA TERMINAL)
```powershell
# Mantén la aplicación corriendo en la terminal actual
# En NUEVA terminal:
ngrok http 5000
```

### 4. Actualizar URLs en código
Editar `client/src/lib/environment.ts`:
- Línea 19: `return 'https://TU-URL-NGROK.ngrok.io';`
- Línea 34: `return 'wss://TU-URL-NGROK.ngrok.io/ws';`

### 5. Construir APK
```powershell
npm run build
npx cap copy android && npx cap sync android
npx cap open android
```

## RESULTADO:
- APK podrá conectarse desde cualquier dispositivo móvil
- Datos se sincronizarán con la base de datos de Replit
- Login funcionará desde la APK

## CREDENCIALES PARA APK:
- jdayne3 / jdayne3
- jdayne / jdayne21