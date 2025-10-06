# PASOS FINALES PARA GENERAR APK

## URLs CONFIGURADAS:
✅ **ngrok URL**: https://cb2f8d314cbf.ngrok-free.app
✅ **WebSocket URL**: wss://cb2f8d314cbf.ngrok-free.app/ws
✅ **Código actualizado automáticamente**

## PASOS PARA CONSTRUIR APK:

### 1. Actualizar código local con cambios de GitHub:
```powershell
# En el directorio del proyecto: D:\APP Pruebas\Kittyapp_Django_v1
git pull origin main
```

### 2. Construir aplicación:
```powershell
npm run build
```

### 3. Preparar Android:
```powershell
npx cap copy android && npx cap sync android
```

### 4. Abrir Android Studio:
```powershell
npx cap open android
```

### 5. En Android Studio:
1. Build → Generate Signed Bundle / APK
2. Seleccionar "APK"
3. Crear keystore (primera vez) o usar existente
4. Generar APK

## RESULTADO:
- APK se conectará a tu servidor local vía ngrok
- Login funcionará con: `jdayne3/jdayne3` o `jdayne/jdayne21`
- Datos se sincronizarán con base de datos Neon
- WebSocket y MQTT funcionarán en tiempo real

## IMPORTANTE:
- Mantén ambas terminales abiertas:
  1. `npm run dev` (servidor)
  2. `ngrok http 5000` (túnel)
- La URL de ngrok cambia cuando reinicias ngrok (versión gratuita)

## CREDENCIALES PARA PROBAR APK:
- **Usuario**: jdayne3 / **Contraseña**: jdayne3
- **Usuario**: jdayne / **Contraseña**: jdayne21

¡APK lista para generar!