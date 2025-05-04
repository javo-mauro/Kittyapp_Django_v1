from django.contrib import admin
from .models import User, Device, SensorData, MqttConnection, PetOwner, Pet

# Configuración del panel de administración
admin.site.site_header = 'KittyPawSensors Admin'
admin.site.site_title = 'KittyPawSensors'
admin.site.index_title = 'Panel de Administración'

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'name', 'role', 'last_login')
    search_fields = ('username', 'name')
    list_filter = ('role',)

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('device_id', 'name', 'type', 'status', 'battery_level', 'last_update')
    search_fields = ('device_id', 'name')
    list_filter = ('status', 'type')

@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ('device', 'sensor_type', 'timestamp')
    search_fields = ('device__device_id', 'device__name', 'sensor_type')
    list_filter = ('sensor_type', 'timestamp')
    date_hierarchy = 'timestamp'

@admin.register(MqttConnection)
class MqttConnectionAdmin(admin.ModelAdmin):
    list_display = ('broker_url', 'client_id', 'connected', 'last_connected')
    search_fields = ('broker_url', 'client_id')
    list_filter = ('connected',)

@admin.register(PetOwner)
class PetOwnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'paternal_last_name', 'email', 'username')
    search_fields = ('name', 'paternal_last_name', 'email', 'username')
    list_filter = ('created_at',)

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'breed', 'species', 'kitty_paw_device')
    search_fields = ('name', 'chip_number', 'owner__name')
    list_filter = ('species', 'breed', 'has_vaccinations')
