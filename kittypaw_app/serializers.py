from rest_framework import serializers
from .models import User, Device, SensorData, MqttConnection, PetOwner, Pet
from django.contrib.auth import authenticate

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'role', 'last_login']
        
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(
                request=self.context.get('request'),
                username=username, 
                password=password
            )
            if not user:
                raise serializers.ValidationError('Credenciales incorrectas')
            data['user'] = user
        else:
            raise serializers.ValidationError('Debe proporcionar usuario y contraseña')
        
        return data

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = '__all__'

class SensorDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorData
        fields = '__all__'
        
class SensorReadingSerializer(serializers.Serializer):
    deviceId = serializers.CharField(source='device.device_id')
    sensorType = serializers.CharField(source='sensor_type')
    value = serializers.FloatField()
    unit = serializers.CharField()
    timestamp = serializers.DateTimeField()

class MqttConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MqttConnection
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

class PetOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PetOwner
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

class PetSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Pet
        fields = '__all__'
        
    def get_owner_name(self, obj):
        return f"{obj.owner.name} {obj.owner.paternal_last_name}"

class SystemMetricsSerializer(serializers.Serializer):
    activeDevices = serializers.IntegerField()
    activeSensors = serializers.IntegerField()
    alerts = serializers.IntegerField()
    lastUpdate = serializers.DateTimeField()

class SystemInfoSerializer(serializers.Serializer):
    version = serializers.CharField()
    mqttVersion = serializers.CharField()
    lastUpdate = serializers.DateTimeField()