
import os
import psycopg2
import gspread
from google.oauth2.service_account import Credentials
import json
from datetime import datetime

def connect_to_neon():
    """Conecta a la base de datos Neon PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host="ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech",
            database="neondb",
            user="neondb_owner",
            password="npg_haLf64lsGvBr",
            sslmode="require"
        )
        print("✅ Conexión exitosa a Neon PostgreSQL")
        return conn
    except Exception as e:
        print(f"❌ Error conectando a Neon: {e}")
        return None

def get_tables_data(conn):
    """Obtiene datos de las tablas principales del proyecto KittyPaw"""
    cursor = conn.cursor()
    tables_data = {}
    
    try:
        # Obtener usuarios
        cursor.execute("SELECT * FROM kittypaw_app_user LIMIT 100")
        columns = [desc[0] for desc in cursor.description]
        users_data = cursor.fetchall()
        tables_data['usuarios'] = {
            'columns': columns,
            'data': users_data
        }
        print(f"✅ Usuarios obtenidos: {len(users_data)} registros")
        
        # Obtener dispositivos (si existe la tabla)
        try:
            cursor.execute("SELECT * FROM kittypaw_app_device LIMIT 100")
            columns = [desc[0] for desc in cursor.description]
            devices_data = cursor.fetchall()
            tables_data['dispositivos'] = {
                'columns': columns,
                'data': devices_data
            }
            print(f"✅ Dispositivos obtenidos: {len(devices_data)} registros")
        except:
            print("⚠️  Tabla de dispositivos no encontrada")
        
        # Obtener datos de sensores (si existe la tabla)
        try:
            cursor.execute("SELECT * FROM kittypaw_app_sensordata ORDER BY timestamp DESC LIMIT 100")
            columns = [desc[0] for desc in cursor.description]
            sensors_data = cursor.fetchall()
            tables_data['datos_sensores'] = {
                'columns': columns,
                'data': sensors_data
            }
            print(f"✅ Datos de sensores obtenidos: {len(sensors_data)} registros")
        except:
            print("⚠️  Tabla de datos de sensores no encontrada")
        
        # Obtener mascotas (si existe la tabla)
        try:
            cursor.execute("SELECT * FROM kittypaw_app_pet LIMIT 100")
            columns = [desc[0] for desc in cursor.description]
            pets_data = cursor.fetchall()
            tables_data['mascotas'] = {
                'columns': columns,
                'data': pets_data
            }
            print(f"✅ Mascotas obtenidas: {len(pets_data)} registros")
        except:
            print("⚠️  Tabla de mascotas no encontrada")
            
    except Exception as e:
        print(f"❌ Error obteniendo datos: {e}")
    
    return tables_data

def upload_to_google_sheets(tables_data):
    """Sube los datos a Google Sheets"""
    try:
        # Configurar credenciales de Google Sheets
        # Nota: Necesitarás crear el archivo credenciales.json con las credenciales de tu proyecto
        
        if not os.path.exists("credenciales.json"):
            print("⚠️  Archivo credenciales.json no encontrado")
            print("Para usar Google Sheets, necesitas:")
            print("1. Crear un proyecto en Google Cloud Console")
            print("2. Habilitar Google Sheets API")
            print("3. Crear credenciales de cuenta de servicio")
            print("4. Descargar el archivo JSON y renombrarlo a 'credenciales.json'")
            return
        
        gc = gspread.service_account(filename="credenciales.json")
        
        # Abrir la hoja de cálculo
        sheet_id = "1u0o5YKunyMWYd5-Zuhcw3zDLP9xJumFr01P4dxvfRM4"
        spreadsheet = gc.open_by_key(sheet_id)
        
        for table_name, table_info in tables_data.items():
            try:
                # Intentar obtener la hoja, si no existe, crearla
                try:
                    worksheet = spreadsheet.worksheet(table_name)
                    worksheet.clear()  # Limpiar datos existentes
                except gspread.WorksheetNotFound:
                    worksheet = spreadsheet.add_worksheet(title=table_name, rows=1000, cols=20)
                
                # Preparar datos para subir
                if table_info['data']:
                    # Convertir datos a formato compatible con Sheets
                    formatted_data = []
                    formatted_data.append(table_info['columns'])  # Encabezados
                    
                    for row in table_info['data']:
                        formatted_row = []
                        for cell in row:
                            if cell is None:
                                formatted_row.append("")
                            elif isinstance(cell, datetime):
                                formatted_row.append(cell.strftime("%Y-%m-%d %H:%M:%S"))
                            else:
                                formatted_row.append(str(cell))
                        formatted_data.append(formatted_row)
                    
                    # Subir datos
                    worksheet.update('A1', formatted_data)
                    print(f"✅ Datos de '{table_name}' subidos exitosamente")
                
            except Exception as e:
                print(f"❌ Error subiendo '{table_name}': {e}")
                
    except Exception as e:
        print(f"❌ Error general con Google Sheets: {e}")

def main():
    """Función principal"""
    print("🐾 KittyPaw - Exportación de datos Neon → Google Sheets")
    print("=" * 50)
    
    # Conectar a Neon
    conn = connect_to_neon()
    if not conn:
        return
    
    # Obtener datos
    print("\n📊 Obteniendo datos de las tablas...")
    tables_data = get_tables_data(conn)
    
    if not tables_data:
        print("❌ No se obtuvieron datos")
        return
    
    # Mostrar resumen
    print(f"\n📋 Resumen de datos obtenidos:")
    for table_name, table_info in tables_data.items():
        print(f"  - {table_name}: {len(table_info['data'])} registros")
    
    # Subir a Google Sheets
    print("\n☁️  Subiendo datos a Google Sheets...")
    upload_to_google_sheets(tables_data)
    
    # Cerrar conexión
    conn.close()
    print("\n✅ Proceso completado")

if __name__ == "__main__":
    main()
