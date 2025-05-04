import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Device, SensorData
from .mqtt_client import mqtt_client
import logging

logger = logging.getLogger(__name__)

class SensorDataConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Cliente se conecta al WebSocket
        """
        # Aceptar la conexión
        await self.accept()
        logger.info(f"Cliente WebSocket conectado: {self.channel_name}")
        
        # Registro en el cliente MQTT
        # Nota: esto debe hacerse de forma asíncrona para no bloquear
        await self.send_initial_data()
    
    async def disconnect(self, close_code):
        """
        Cliente se desconecta del WebSocket
        """
        logger.info(f"Cliente WebSocket desconectado: {self.channel_name}")
    
    async def receive(self, text_data):
        """
        Recibe datos del cliente WebSocket
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'subscribe':
                topic = data.get('topic')
                if topic:
                    # Llamar a método síncrono en un hilo separado
                    await database_sync_to_async(mqtt_client.add_topic)(topic)
                    await self.send(text_data=json.dumps({
                        'type': 'subscription_success',
                        'topic': topic
                    }))
                    
            elif message_type == 'publish':
                topic = data.get('topic')
                message = data.get('message')
                if topic and message:
                    # Llamar a método síncrono en un hilo separado
                    result = await database_sync_to_async(mqtt_client.publish)(topic, message)
                    await self.send(text_data=json.dumps({
                        'type': 'publish_result',
                        'success': result
                    }))
                    
        except json.JSONDecodeError:
            logger.error(f"Error decodificando mensaje WebSocket: {text_data}")
        except Exception as e:
            logger.error(f"Error procesando mensaje WebSocket: {str(e)}")
    
    @database_sync_to_async
    def get_devices(self):
        """
        Obtiene todos los dispositivos
        """
        return list(Device.objects.all().values())
    
    @database_sync_to_async
    def get_recent_sensor_data(self, device_id, limit=60):
        """
        Obtiene los datos recientes de un dispositivo
        """
        try:
            device = Device.objects.get(device_id=device_id)
            data = []
            for sensor_type in ['temperature', 'humidity', 'light', 'weight']:
                readings = SensorData.objects.filter(
                    device=device,
                    sensor_type=sensor_type
                ).order_by('-timestamp')[:limit]
                
                sensor_data = []
                for reading in readings:
                    try:
                        reading_data = json.loads(reading.data)
                        sensor_data.append({
                            'value': reading_data.get('value', 0),
                            'unit': reading_data.get('unit', ''),
                            'timestamp': reading.timestamp.isoformat()
                        })
                    except Exception as e:
                        logger.error(f"Error procesando lectura: {str(e)}")
                
                # Invertir para que estén en orden cronológico
                sensor_data.reverse()
                
                data.append({
                    'deviceId': device_id,
                    'sensorType': sensor_type,
                    'data': sensor_data
                })
            
            return data
        except Device.DoesNotExist:
            logger.warning(f"Dispositivo no encontrado: {device_id}")
            return []
        except Exception as e:
            logger.error(f"Error obteniendo datos del sensor: {str(e)}")
            return []
    
    async def send_initial_data(self):
        """
        Envía datos iniciales al cliente
        """
        try:
            # Obtener todos los dispositivos
            devices = await self.get_devices()
            
            # Enviar lista de dispositivos
            await self.send(text_data=json.dumps({
                'type': 'devices',
                'data': devices
            }))
            
            # Enviar datos de sensor para cada dispositivo
            for device in devices:
                device_id = device['device_id']
                sensor_data = await self.get_recent_sensor_data(device_id)
                
                await self.send(text_data=json.dumps({
                    'type': 'sensorData',
                    'data': sensor_data
                }))
                
        except Exception as e:
            logger.error(f"Error enviando datos iniciales: {str(e)}")
    
    async def send_sensor_data(self, event):
        """
        Envía datos de sensores a los clientes WebSocket
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'sensorData',
                'data': event['data']
            }))
        except Exception as e:
            logger.error(f"Error enviando datos del sensor al cliente WebSocket: {str(e)}")
    
    async def send_device_status(self, event):
        """
        Envía actualizaciones de estado de dispositivos a los clientes WebSocket
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'deviceStatus',
                'deviceId': event['deviceId'],
                'status': event['status']
            }))
        except Exception as e:
            logger.error(f"Error enviando estado del dispositivo al cliente WebSocket: {str(e)}")