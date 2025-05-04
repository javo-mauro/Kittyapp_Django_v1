from django.apps import AppConfig


class KittypawAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kittypaw_app'
    
    def ready(self):
        # Conectar al broker MQTT cuando arranca la aplicación
        try:
            from .mqtt_client import mqtt_client
            mqtt_client.load_and_connect()
        except Exception as e:
            print(f"Error conectando con MQTT: {e}")