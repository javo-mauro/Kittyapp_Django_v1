# Configuración Local - Solución al Error DATABASE_URL

## Error que estás viendo:
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

## SOLUCIÓN RÁPIDA:

### 1. Crear archivo .env
En tu directorio `D:\APP Pruebas\Kittyapp_Django_v1\`, crea un archivo llamado `.env` con este contenido:

```
# Configuración de la base de datos PostgreSQL (Neon)
PGDATABASE=neondb
PGHOST=ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_haLf64lsGvBr
DATABASE_URL=postgresql://neondb_owner:npg_haLf64lsGvBr@ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech/neondb?sslmode=require

# Google Sheets API (para futura integración)
GOOGLE_SHEETS_ID=1u0o5YKunyMWYd5-Zuhcw3zDLP9xJumFr01P4dxvfRM4
```

### 2. Guardar el archivo
- Guarda el archivo como `.env` (con punto al inicio)
- Asegúrate de que no tenga extensión (no `.env.txt`)

### 3. Ejecutar nuevamente
```bash
npm run dev
```

## Alternativa por línea de comandos:

Si prefieres, puedes crear el archivo directamente desde PowerShell:

```powershell
# En PowerShell, dentro del directorio del proyecto:
@"
PGDATABASE=neondb
PGHOST=ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=npg_haLf64lsGvBr
DATABASE_URL=postgresql://neondb_owner:npg_haLf64lsGvBr@ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech/neondb?sslmode=require
GOOGLE_SHEETS_ID=1u0o5YKunyMWYd5-Zuhcw3zDLP9xJumFr01P4dxvfRM4
"@ | Out-File -FilePath ".env" -Encoding UTF8
```

## ¿Por qué pasó esto?
- Los archivos `.env` contienen información sensible (contraseñas)
- GitHub no los incluye por seguridad
- Es normal tener que crearlos manualmente en local

## Después de crear el .env:
- La aplicación se conectará a la misma base de datos de Replit
- Todos los usuarios y datos estarán disponibles
- Podrás hacer login con `jdayne/jdayne21` o `jdayne3/jdayne3`