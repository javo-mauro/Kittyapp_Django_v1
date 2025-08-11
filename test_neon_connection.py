
import psycopg2
import os

def test_connection():
    """Prueba la conexión a Neon PostgreSQL y muestra información de las tablas"""
    try:
        # Conexión usando las credenciales directas
        conn = psycopg2.connect(
            host="ep-royal-voice-a4nxjivp.us-east-1.aws.neon.tech",
            database="neondb",
            user="neondb_owner",
            password="npg_haLf64lsGvBr",
            sslmode="require"
        )
        
        cursor = conn.cursor()
        print("✅ Conexión exitosa a Neon PostgreSQL!")
        
        # Mostrar información de la base de datos
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"📋 Versión de PostgreSQL: {version[0]}")
        
        # Listar todas las tablas
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n📊 Tablas encontradas ({len(tables)}):")
        for table in tables:
            table_name = table[0]
            
            # Contar registros en cada tabla
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"  - {table_name}: {count} registros")
                
                # Mostrar estructura de tablas importantes
                if 'kittypaw' in table_name.lower():
                    cursor.execute(f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = '{table_name}'
                        ORDER BY ordinal_position;
                    """)
                    columns = cursor.fetchall()
                    print(f"    Columnas: {', '.join([col[0] for col in columns])}")
                    
            except Exception as e:
                print(f"  - {table_name}: Error accediendo ({e})")
        
        # Verificar si existen tablas específicas de KittyPaw
        kittypaw_tables = [t[0] for t in tables if 'kittypaw' in t[0].lower()]
        if kittypaw_tables:
            print(f"\n🐾 Tablas de KittyPaw encontradas:")
            for table in kittypaw_tables:
                print(f"  - {table}")
        else:
            print("\n⚠️  No se encontraron tablas específicas de KittyPaw")
            print("   Puede que necesites ejecutar las migraciones de Django primero")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Probando conexión a Neon PostgreSQL...")
    print("=" * 50)
    test_connection()
