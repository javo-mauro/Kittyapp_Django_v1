# CREAR APK - PASOS EXACTOS

## REQUISITOS PREVIOS:
✅ Aplicación corriendo en terminal 1: `npm run dev`
✅ ngrok corriendo en terminal 2: `.\ngrok.exe http 5000`
✅ URLs configuradas: https://cb2f8d314cbf.ngrok-free.app

## COMANDOS PARA EJECUTAR:

### TERMINAL 3 (Nueva terminal en D:\APP Pruebas\Kittyapp_Django_v1):

```powershell
# 1. Actualizar código con URLs de ngrok
git pull origin main

# 2. Construir aplicación web
npm run build

# 3. Copiar archivos a Android
npx cap copy android

# 4. Sincronizar dependencias
npx cap sync android

# 5. Abrir Android Studio
npx cap open android
```

## EN ANDROID STUDIO:

### 1. Esperar a que cargue el proyecto
### 2. Build → Generate Signed Bundle / APK
### 3. Seleccionar "APK" 
### 4. Si es primera vez:
   - Create new... (crear keystore)
   - Llenar datos básicos
   - Recordar contraseña del keystore
### 5. Si ya tienes keystore:
   - Choose existing...
   - Seleccionar archivo .jks
### 6. Build APK
### 7. Locate APK cuando termine

## RESULTADO:
- APK ubicada en: `android/app/build/outputs/apk/`
- Se conectará a tu servidor local vía ngrok
- Login: jdayne3/jdayne3 o jdayne/jdayne21

## PROBLEMA COMÚN:
Si Android Studio no abre automáticamente:
1. Abrir Android Studio manualmente
2. File → Open
3. Seleccionar carpeta: `D:\APP Pruebas\Kittyapp_Django_v1\android`