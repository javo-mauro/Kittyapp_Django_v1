# SOLUCIÓN RÁPIDA PARA WINDOWS

## PROBLEMA:
El código en tu PC local no tiene la corrección para Windows y sigue usando `0.0.0.0`

## SOLUCIÓN INMEDIATA:

### OPCIÓN 1: Actualizar manualmente el archivo
Edita el archivo `server/index.ts` en tu PC local:

**Busca las líneas (~67-77):**
```javascript
const port = 5000;
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});
```

**Reemplaza con:**
```javascript
const port = 5000;

// Use localhost for Windows compatibility, 0.0.0.0 for production/Replit
const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

server.listen({
  port,
  host,
  reusePort: process.platform !== 'win32', // Windows doesn't support reusePort
}, () => {
  log(`serving on ${host}:${port}`);
});
```

### OPCIÓN 2: Forzar git pull
```powershell
# En el directorio del proyecto
git fetch origin
git reset --hard origin/main
```

### DESPUÉS DE LA CORRECCIÓN:
```powershell
$env:DATABASE_URL = "postgresql://neondb_owner:npg_haLf64lsGvBr@ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech/neondb?sslmode=require"
$env:PGDATABASE = "neondb"
$env:PGHOST = "ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech"
$env:PGPORT = "5432"
$env:PGUSER = "neondb_owner"
$env:PGPASSWORD = "npg_haLf64lsGvBr"
$env:NODE_ENV = "development"
npm run dev
```

**RESULTADO ESPERADO:**
```
Inicializando la base de datos...
Base de datos ya inicializada
[mqtt] Connected to MQTT broker
serving on localhost:5000
```

**DESPUÉS ABRIR:** http://localhost:5000