#!/bin/bash

# Script para iniciar la aplicación Django de KittyPawSensors

echo "=== Iniciando KittyPawSensors con Django ==="

# Crear estructura de directorios si no existe
mkdir -p static/css static/js static/img templates

# Aplicar migraciones
echo "Aplicando migraciones..."
python manage.py makemigrations kittypaw_app
python manage.py migrate

# Crear superusuario
echo "Verificando usuarios administradores..."
python create_superuser.py

# Recopilar archivos estáticos
echo "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

# Iniciar el servidor
echo "Iniciando servidor Django..."
python run_django_server.py