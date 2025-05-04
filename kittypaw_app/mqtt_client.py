import json
import threading
import time
from django.utils import timezone
from django.db import transaction
import paho.mqtt.client as mqtt
from .models import Device, SensorData, MqttConnection
import logging

logger = logging.getLogger(__name__)

class MqttClient:
    def __init__(self):
        self.client = None
        self.topics = set(['KPCL0021/pub', 'KPCL0022/pub'])
        self.connection_id = None
        self.reconnect_timer = None
        self.web_sockets = set()
        self.device_last_seen = {}
        self.offline_check_timer = None
        self.DEVICE_TIMEOUT_MS = 15000  # 15 segundos sin datos = dispositivo offline
        
    def connect(self, broker_url="mqtt://broker.emqx.io:1883", client_id="django_kittypaw", username=None, password=None):
        # Limpiar URL si viene con formato mqtt://
        if broker_url.startswith("mqtt://"):
            broker_url = broker_url[7:]
        
        host, port = broker_url.split(":")
        
        try:
            # Crear un nuevo cliente MQTT
            self.client = mqtt.Client(client_id=client_id)
            
            # Configurar credenciales si se proporcionan
            if username and password:
                self.client.username_pw_set(username, password)
            
            # Configurar callbacks
            self.client.on_connect = self.on_connect
            self.client.on_message = self.on_message
            self.client.on_disconnect = self.on_disconnect
            
            # Conectar al broker
            self.client.connect(host, int(port), 60)
            
            # Iniciar el loop en un hilo separado
            self.client.loop_start()
            
            # Iniciar el temporizador de verificación de dispositivos offline
            self.start_offline_check_timer()
            
            # Actualizar la base de datos
            with transaction.atomic():
                connection = MqttConnection.objects.create(
                    broker_url=broker_url,
                    client_id=client_id,
                    username=username,
                    password=password,
                    connected=True,
                    last_connected=timezone.now()
                )
                self.connection_id = connection.id
            
            logger.info(f"Conectado a broker MQTT: {broker_url}")
            return True
            
        except Exception as e:
            logger.error(f"Error al conectar a MQTT: {str(e)}")
            return False
    
    def disconnect(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.client = None
            
            # Actualizar la base de datos
            if self.connection_id:
                try:
                    connection = MqttConnection.objects.get(id=self.connection_id)
                    connection.connected = False
                    connection.save()
                except MqttConnection.DoesNotExist:
                    pass
                
            logger.info("Desconectado del broker MQTT")
    
    def on_connect(self, client, userdata, flags, rc):
        logger.info("Conectado al broker MQTT")
        # Suscribirse a todos los tópicos
        self.subscribe()
    
    def on_disconnect(self, client, userdata, rc):
        logger.warning(f"Desconectado del broker MQTT con código: {rc}")
        # Intenta reconectar después de un tiempo
        if self.reconnect_timer:
            self.reconnect_timer.cancel()
        self.reconnect_timer = threading.Timer(5.0, self.client.reconnect)
        self.reconnect_timer.daemon = True
        self.reconnect_timer.start()
    
    def subscribe(self):
        for topic in self.topics:
            self.client.subscribe(topic)
            logger.info(f"Suscrito al tópico: {topic}")
    
    def add_topic(self, topic):
        # Formatear el tópico si es necesario
        if not topic.endswith('/pub'):
            topic = f"{topic}/pub"
            logger.info(f"Formateando tópico como {topic} para asegurar el formato correcto")
        
        if topic not in self.topics:
            self.topics.add(topic)
            if self.client and self.client.is_connected():
                self.client.subscribe(topic)
                logger.info(f"Añadido nuevo tópico: {topic}")
    
    def start_offline_check_timer(self):
        def check_offline_devices():
            while self.client and self.client.is_connected():
                current_time = time.time() * 1000
                for device_id, last_seen in list(self.device_last_seen.items()):
                    if current_time - last_seen > self.DEVICE_TIMEOUT_MS:
                        self.update_device_status(device_id, "offline")
                time.sleep(5)  # Verificar cada 5 segundos
        
        self.offline_check_timer = threading.Thread(target=check_offline_devices, daemon=True)
        self.offline_check_timer.start()
        logger.info("Iniciado temporizador de detección de dispositivos offline")
    
    def update_device_status(self, device_id, status):
        try:
            device = Device.objects.get(device_id=device_id)
            if device.status != status:
                device.status = status
                device.last_update = timezone.now()
                device.save()
                logger.info(f"Actualizado estado del dispositivo {device_id} a {status}")
                
                # Enviar notificación a los clientes websocket
                self.broadcast_to_clients({
                    'type': 'deviceStatus',
                    'deviceId': device_id,
                    'status': status
                })
            else:
                logger.warning(f"No se actualizó el estado de {device_id} de {device.status} a {status}. Estado actual: {device.status}")
        except Device.DoesNotExist:
            logger.warning(f"Dispositivo no encontrado: {device_id}")
    
    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode('utf-8'))
            device_id = payload.get('device_id')
            
            if not device_id:
                logger.warning(f"Mensaje sin device_id: {payload}")
                return
            
            # Actualizar última vez visto
            self.device_last_seen[device_id] = time.time() * 1000
            
            # Actualizar estado del dispositivo (si es diferente)
            status = payload.get('status', 'online')
            self.update_device_status(device_id, status)
            
            # Actualizar nivel de batería si existe
            if 'battery' in payload:
                try:
                    device = Device.objects.get(device_id=device_id)
                    device.battery_level = int(payload['battery'])
                    device.save()
                except (Device.DoesNotExist, ValueError):
                    pass
            
            # Guardar datos de sensores
            timestamp = timezone.now()
            if 'timestamp' in payload:
                try:
                    # Convertir timestamp del formato "DD/MM/YYYY, HH:MM:SS"
                    timestamp = timezone.datetime.strptime(
                        payload['timestamp'], 
                        "%d/%m/%Y, %H:%M:%S"
                    )
                except ValueError:
                    pass
            
            # Crear registros para cada tipo de sensor
            sensor_types = ['temperature', 'humidity', 'light', 'weight']
            for sensor_type in sensor_types:
                if sensor_type in payload:
                    try:
                        device = Device.objects.get(device_id=device_id)
                        SensorData.objects.create(
                            device=device,
                            timestamp=timestamp,
                            sensor_type=sensor_type,
                            data=json.dumps({
                                'value': float(payload[sensor_type]),
                                'unit': self.get_unit_for_sensor(sensor_type),
                                'timestamp': timestamp.isoformat()
                            })
                        )
                    except (Device.DoesNotExist, ValueError) as e:
                        logger.error(f"Error al guardar datos de sensor {sensor_type}: {str(e)}")
            
            # Transmitir a clientes websocket
            self.broadcast_to_clients({
                'type': 'sensorData',
                'deviceId': device_id,
                'data': payload
            })
                
        except json.JSONDecodeError:
            logger.error(f"Error decodificando mensaje MQTT: {msg.payload}")
        except Exception as e:
            logger.error(f"Error procesando mensaje MQTT: {str(e)}")
    
    def get_unit_for_sensor(self, sensor_type):
        units = {
            'temperature': '°C',
            'humidity': '%',
            'light': 'lux',
            'weight': 'kg'
        }
        return units.get(sensor_type, '')
    
    def is_connected(self):
        return self.client and self.client.is_connected()
    
    def publish(self, topic, message):
        if not self.is_connected():
            logger.error("No se puede publicar: cliente MQTT no conectado")
            return False
        
        if isinstance(message, dict):
            message = json.dumps(message)
        
        result = self.client.publish(topic, message)
        return result.rc == mqtt.MQTT_ERR_SUCCESS
    
    def broadcast_to_clients(self, data):
        """
        Transmite datos a todos los clientes WebSocket
        """
        try:
            # Importar asíncronamente para evitar problemas de importación circular
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            message_type = data.get('type')
            
            if message_type == 'sensorData':
                async_to_sync(channel_layer.group_send)(
                    'sensor_data_group',
                    {
                        'type': 'send_sensor_data',
                        'data': data.get('data', {})
                    }
                )
            elif message_type == 'deviceStatus':
                async_to_sync(channel_layer.group_send)(
                    'sensor_data_group',
                    {
                        'type': 'send_device_status',
                        'deviceId': data.get('deviceId'),
                        'status': data.get('status')
                    }
                )
        except Exception as e:
            logger.error(f"Error transmitiendo datos a clientes WebSocket: {str(e)}")
    
    def load_and_connect(self):
        try:
            # Buscar la última conexión activa
            connection = MqttConnection.objects.filter(connected=True).order_by('-last_connected').first()
            if connection:
                return self.connect(
                    broker_url=connection.broker_url,
                    client_id=connection.client_id,
                    username=connection.username,
                    password=connection.password
                )
            else:
                # Conectar al broker público por defecto
                return self.connect(broker_url="mqtt://broker.emqx.io:1883")
        except Exception as e:
            logger.error(f"Error cargando configuración MQTT: {str(e)}")
            return False

# Instancia global del cliente MQTT
mqtt_client = MqttClient()