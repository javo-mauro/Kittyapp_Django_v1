# Comandos para Ejecutar en Windows

## PASO 1: Configurar Variables de Entorno
Ejecuta estos comandos en PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://neondb_owner:npg_haLf64lsGvBr@ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech/neondb?sslmode=require"
$env:PGDATABASE = "neondb"
$env:PGHOST = "ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech"
$env:PGPORT = "5432"
$env:PGUSER = "neondb_owner"
$env:PGPASSWORD = "npg_haLf64lsGvBr"
$env:NODE_ENV = "development"
```

## PASO 2: Ejecutar Aplicación
```powershell
npm run dev
```

## RESULTADO ESPERADO:
```
Inicializando la base de datos...
Base de datos ya inicializada
[mqtt] Connecting to MQTT broker: mqtt://broker.emqx.io:1883
[mqtt] Connected to MQTT broker
[express] serving on localhost:5000
```

## ABRIR EN NAVEGADOR:
http://localhost:5000

## CREDENCIALES DE PRUEBA:
- Usuario: `jdayne` / Contraseña: `jdayne21`
- Usuario: `jdayne3` / Contraseña: `jdayne3`

## PARA ngrok (Cuando esté listo):
1. En otra terminal: `ngrok http 5000`
2. Copiar la URL HTTPS de ngrok
3. Actualizar `client/src/lib/environment.ts`
4. Reconstruir APK