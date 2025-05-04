#!/usr/bin/env python
"""
Script para iniciar el servidor Django con Daphne (ASGI)
"""
import os
import sys
import subprocess
import time
import signal

def run_server():
    """Ejecuta el servidor Django con Daphne"""
    print("Iniciando servidor KittyPawSensors con Django...")
    
    # Asegurarse de que las migraciones estén aplicadas
    try:
        print("Aplicando migraciones...")
        subprocess.run([sys.executable, "manage.py", "makemigrations"], check=True)
        subprocess.run([sys.executable, "manage.py", "migrate"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error al aplicar migraciones: {e}")
        return
    
    # Iniciar el servidor con Daphne
    try:
        # Daphne permite manejar tanto HTTP como WebSockets
        server_process = subprocess.Popen([
            sys.executable, "-m", "daphne", 
            "-b", "0.0.0.0", 
            "-p", "5000", 
            "kittypaw_project.asgi:application"
        ])
        
        # Manejador de señales para una salida limpia
        def signal_handler(sig, frame):
            print("Cerrando el servidor...")
            server_process.terminate()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Mantener el script ejecutándose
        print("Servidor Django iniciado en http://0.0.0.0:5000/")
        server_process.wait()
        
    except Exception as e:
        print(f"Error al iniciar el servidor: {e}")

if __name__ == "__main__":
    run_server()