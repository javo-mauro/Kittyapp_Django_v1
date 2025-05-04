#!/usr/bin/env python
"""
Script para crear un superusuario de Django automáticamente
"""
import os
import django

# Configurar entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kittypaw_project.settings')
django.setup()

from kittypaw_app.models import User

def create_admin_user():
    """Crea un usuario administrador si no existe"""
    try:
        # Comprobar si ya existe un superusuario con username 'admin'
        if not User.objects.filter(username='admin').exists():
            print("Creando superusuario 'admin'...")
            admin = User.objects.create_superuser(
                username='admin',
                password='admin123',
                name='Administrador',
                role='admin'
            )
            admin.save()
            print("Superusuario creado exitosamente.")
        else:
            print("El superusuario 'admin' ya existe.")
            
        # Crear el usuario Javier Dayne como administrador
        if not User.objects.filter(username='jdayne').exists():
            print("Creando usuario 'jdayne'...")
            user = User.objects.create_user(
                username='jdayne', 
                password='jdayne21',
                name='Javier Dayne',
                role='admin',
                is_staff=True
            )
            user.save()
            print("Usuario 'jdayne' creado exitosamente.")
        else:
            print("El usuario 'jdayne' ya existe.")
            
    except Exception as e:
        print(f"Error al crear superusuario: {e}")

if __name__ == '__main__':
    create_admin_user()