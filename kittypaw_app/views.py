from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from django.conf import settings
from django.db.models import Count
from django.contrib.auth import login, logout, authenticate
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect

from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import User, Device, SensorData, MqttConnection, PetOwner, Pet
from .serializers import (
    UserSerializer, LoginSerializer, DeviceSerializer, SensorDataSerializer,
    MqttConnectionSerializer, PetOwnerSerializer, PetSerializer,
    SystemMetricsSerializer, SystemInfoSerializer, SensorReadingSerializer
)
from .mqtt_client import mqtt_client

import json
import logging

logger = logging.getLogger(__name__)

# Authentication views
class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            
            # Actualizar último inicio de sesión
            user.last_login = timezone.now()
            user.save()
            
            return Response({
                'user': UserSerializer(user).data,
                'message': 'Inicio de sesión exitoso'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logout(request)
        return Response({'message': 'Sesión cerrada exitosamente'})

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response(UserSerializer(request.user).data)

# Device views
class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        
        # Añadir tópico al cliente MQTT
        if response.status_code == status.HTTP_201_CREATED:
            device_id = response.data.get('device_id')
            if device_id:
                mqtt_client.add_topic(device_id)
        
        return response

# SensorData views
class SensorDataView(APIView):
    def get(self, request, device_id):
        limit = int(request.query_params.get('limit', 100))
        sensor_type = request.query_params.get('type')
        
        device = get_object_or_404(Device, device_id=device_id)
        
        if sensor_type:
            data = SensorData.objects.filter(device=device, sensor_type=sensor_type)[:limit]
        else:
            data = SensorData.objects.filter(device=device)[:limit]
        
        serializer = SensorDataSerializer(data, many=True)
        return Response(serializer.data)

class LatestReadingsView(APIView):
    def get(self, request):
        # Obtener la última lectura de cada dispositivo para cada tipo de sensor
        latest_readings = []
        
        for device in Device.objects.all():
            for sensor_type in ['temperature', 'humidity', 'light', 'weight']:
                try:
                    reading = SensorData.objects.filter(
                        device=device,
                        sensor_type=sensor_type
                    ).order_by('-timestamp').first()
                    
                    if reading:
                        data = json.loads(reading.data)
                        latest_readings.append({
                            'device': device,
                            'sensor_type': sensor_type,
                            'value': data.get('value', 0),
                            'unit': data.get('unit', ''),
                            'timestamp': reading.timestamp
                        })
                except Exception as e:
                    logger.error(f"Error obteniendo lectura para {device.device_id} - {sensor_type}: {str(e)}")
        
        serializer = SensorReadingSerializer(latest_readings, many=True)
        return Response(serializer.data)

# MQTT views
class MqttStatusView(APIView):
    def get(self, request):
        return Response({
            'connected': mqtt_client.is_connected(),
            'topics': list(mqtt_client.topics)
        })

class MqttConnectView(APIView):
    def post(self, request):
        broker_url = request.data.get('brokerUrl', 'mqtt://broker.emqx.io:1883')
        client_id = request.data.get('clientId', f'django_mqtt_{request.user.id}')
        username = request.data.get('username')
        password = request.data.get('password')
        
        success = mqtt_client.connect(
            broker_url=broker_url,
            client_id=client_id,
            username=username,
            password=password
        )
        
        if success:
            return Response({'message': 'Conectado con éxito al broker MQTT'})
        else:
            return Response(
                {'message': 'Error al conectar al broker MQTT'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MqttSubscribeView(APIView):
    def post(self, request):
        topic = request.data.get('topic')
        if not topic:
            return Response(
                {'message': 'Se requiere un tópico para suscribirse'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mqtt_client.add_topic(topic)
        return Response({'message': f'Suscrito al tópico {topic}'})

# Pet & PetOwner views
class PetOwnerViewSet(viewsets.ModelViewSet):
    queryset = PetOwner.objects.all()
    serializer_class = PetOwnerSerializer

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    
    def get_queryset(self):
        queryset = Pet.objects.all()
        owner_id = self.request.query_params.get('owner_id')
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        return queryset

class PetByDeviceView(APIView):
    def get(self, request, device_id):
        pet = get_object_or_404(Pet, kitty_paw_device__device_id=device_id)
        serializer = PetSerializer(pet)
        return Response(serializer.data)

# System information views
class SystemMetricsView(APIView):
    def get(self, request):
        active_devices = Device.objects.filter(status='online').count()
        
        # Contar los sensores activos (los que han enviado datos en la última hora)
        one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
        active_sensors = SensorData.objects.filter(timestamp__gte=one_hour_ago).values('device', 'sensor_type').distinct().count()
        
        metrics = {
            'activeDevices': active_devices,
            'activeSensors': active_sensors,
            'alerts': 0,  # No hay sistema de alertas implementado aún
            'lastUpdate': timezone.now().isoformat()
        }
        
        serializer = SystemMetricsSerializer(metrics)
        return Response(serializer.data)

class SystemInfoView(APIView):
    def get(self, request):
        info = {
            'version': '1.0.0',
            'mqttVersion': '3.1.1',
            'lastUpdate': timezone.now().isoformat()
        }
        
        serializer = SystemInfoSerializer(info)
        return Response(serializer.data)

# Vistas de plantillas Django
@login_required(login_url='/login/')
def index_view(request):
    """Vista principal del dashboard"""
    # Obtener datos para el contexto
    active_devices = Device.objects.filter(status='online').count()
    total_devices = Device.objects.count()
    
    # Si el usuario no es admin, filtrar dispositivos por propietario
    if request.user.role != 'admin':
        # Buscar el propietario asociado con este usuario (si existe)
        try:
            owner = PetOwner.objects.get(username=request.user.username)
            # Obtener las mascotas del propietario
            pets = Pet.objects.filter(owner=owner)
            # Obtener los dispositivos asociados a estas mascotas
            device_ids = [pet.kitty_paw_device_id for pet in pets if pet.kitty_paw_device_id]
            active_devices = Device.objects.filter(device_id__in=device_ids, status='online').count()
            total_devices = Device.objects.filter(device_id__in=device_ids).count()
        except PetOwner.DoesNotExist:
            # El usuario no está asociado a ningún propietario
            active_devices = 0
            total_devices = 0
    
    # Contexto para la plantilla
    context = {
        'active_devices': active_devices,
        'total_devices': total_devices,
        'page_title': 'Dashboard'
    }
    return render(request, 'index.html', context)

@login_required(login_url='/login/')
def devices_view(request):
    """Vista de dispositivos"""
    return render(request, 'devices.html', {'page_title': 'Dispositivos'})

@login_required(login_url='/login/')
def device_detail_view(request, device_id):
    """Vista detallada de un dispositivo específico"""
    device = get_object_or_404(Device, device_id=device_id)
    
    # Verificar si el usuario tiene acceso a este dispositivo
    if request.user.role != 'admin':
        try:
            owner = PetOwner.objects.get(username=request.user.username)
            pet = Pet.objects.filter(owner=owner, kitty_paw_device=device).first()
            if not pet:
                # El usuario no tiene acceso a este dispositivo
                return redirect('devices')
        except PetOwner.DoesNotExist:
            # El usuario no está asociado a ningún propietario
            return redirect('devices')
    
    context = {
        'device': device,
        'page_title': f'Dispositivo: {device.name or device.device_id}'
    }
    return render(request, 'device_detail.html', context)

@login_required(login_url='/login/')
def pets_view(request):
    """Vista de mascotas"""
    return render(request, 'pets.html', {'page_title': 'Mascotas'})

@login_required(login_url='/login/')
def pet_detail_view(request, pet_id):
    """Vista detallada de una mascota específica"""
    pet = get_object_or_404(Pet, id=pet_id)
    
    # Verificar si el usuario tiene acceso a esta mascota
    if request.user.role != 'admin':
        try:
            owner = PetOwner.objects.get(username=request.user.username)
            if pet.owner != owner:
                # El usuario no tiene acceso a esta mascota
                return redirect('pets')
        except PetOwner.DoesNotExist:
            # El usuario no está asociado a ningún propietario
            return redirect('pets')
    
    context = {
        'pet': pet,
        'page_title': f'Mascota: {pet.name}'
    }
    return render(request, 'pet_detail.html', context)

@csrf_protect
def login_view(request):
    """Vista de inicio de sesión"""
    error_message = None
    
    # Si el usuario ya está autenticado, redirigir al dashboard
    if request.user.is_authenticated:
        return redirect('index')
        
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # Autenticar usuario
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Iniciar sesión
            login(request, user)
            
            # Actualizar fecha de último login
            user.last_login = timezone.now()
            user.save()
            
            # Redirigir al dashboard
            return redirect('index')
        else:
            error_message = 'Nombre de usuario o contraseña incorrectos'
    
    return render(request, 'login.html', {'error_message': error_message, 'page_title': 'Iniciar Sesión'})

@login_required(login_url='/login/')
def logout_view(request):
    """Vista para cerrar sesión"""
    logout(request)
    return redirect('login')
