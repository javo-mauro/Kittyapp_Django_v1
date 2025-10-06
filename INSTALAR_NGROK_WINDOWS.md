# Instalar ngrok en Windows

## OPCIÓN 1: Descarga Manual (Más fácil)

### 1. Descargar ngrok:
- Ve a: https://ngrok.com/download
- Haz clic en "Windows (64-bit)" para descargar
- Se descargará un archivo ZIP

### 2. Extraer e instalar:
- Extrae el archivo ZIP
- Copia el archivo `ngrok.exe` a una carpeta como `C:\ngrok\`
- Agrega esa carpeta al PATH de Windows:
  * Busca "Variables de entorno" en el menú inicio
  * Edita las variables del sistema
  * Agrega `C:\ngrok\` al PATH

### 3. Reiniciar PowerShell y configurar:
```powershell
# Cerrar y reabrir PowerShell, luego:
ngrok config add-authtoken 31UFEGTVLGUv1xD23fX2kjozYaB_5ctz4VXHt4Ebx1Xcn3zkp
```

## OPCIÓN 2: Chocolatey (Si lo tienes instalado)
```powershell
# Solo si tienes Chocolatey
choco install ngrok
```

## OPCIÓN 3: Usando el ejecutable directamente

### 1. Descarga ngrok desde https://ngrok.com/download
### 2. Extrae y ejecuta desde la carpeta:
```powershell
# Navega a donde extracte ngrok
cd "C:\Downloads\ngrok-stable-windows-amd64" # O donde lo extracte
.\ngrok.exe config add-authtoken 31UFEGTVLGUv1xD23fX2kjozYaB_5ctz4VXHt4Ebx1Xcn3zkp
.\ngrok.exe http 5000
```

## DESPUÉS DE LA INSTALACIÓN:

### 1. Configurar authtoken:
```powershell
ngrok config add-authtoken 31UFEGTVLGUv1xD23fX2kjozYaB_5ctz4VXHt4Ebx1Xcn3zkp
```

### 2. Crear túnel (EN NUEVA TERMINAL):
```powershell
ngrok http 5000
```

### 3. Copiar la URL HTTPS que aparezca:
```
Forwarding    https://abc123def.ngrok.io -> http://localhost:5000
```

### 4. Actualizar código con esa URL