from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class KittypawAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kittypaw_app'
    
    def ready(self):
        """
        Inicializa componentes de la aplicación al arrancar
        """
        try:
            # Importar el cliente MQTT e inicializar la conexión
            from .mqtt_client import mqtt_client
            mqtt_client.load_and_connect()
            logger.info("Cliente MQTT inicializado")
        except Exception as e:
            logger.error(f"Error inicializando cliente MQTT: {str(e)}")