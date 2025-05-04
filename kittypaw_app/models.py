from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser, BaseUserManager
import json

class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('El username es obligatorio')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save()
        return user
    
    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(username, password, **extra_fields)

class User(AbstractUser):
    name = models.CharField(max_length=100, blank=True, null=True)
    role = models.CharField(max_length=20, default='user')
    last_login = models.DateTimeField(blank=True, null=True)
    
    objects = UserManager()
    
    def __str__(self):
        return self.username

class Device(models.Model):
    device_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50)
    ip_address = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, default='offline')
    battery_level = models.IntegerField(blank=True, null=True)
    last_update = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.name} ({self.device_id})"

class SensorData(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, to_field='device_id', db_column='device_id')
    timestamp = models.DateTimeField(default=timezone.now)
    data = models.JSONField()
    sensor_type = models.CharField(max_length=50)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.device.name} - {self.sensor_type} - {self.timestamp}"

class MqttConnection(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    broker_url = models.CharField(max_length=255)
    client_id = models.CharField(max_length=100)
    username = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=100, blank=True, null=True)
    ca_cert = models.TextField(blank=True, null=True)
    client_cert = models.TextField(blank=True, null=True)
    private_key = models.TextField(blank=True, null=True)
    connected = models.BooleanField(default=False)
    last_connected = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.broker_url} - {self.client_id}"

class PetOwner(models.Model):
    name = models.CharField(max_length=100)
    paternal_last_name = models.CharField(max_length=100)
    maternal_last_name = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255)
    birth_date = models.DateTimeField()
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} {self.paternal_last_name}"

class Pet(models.Model):
    owner = models.ForeignKey(PetOwner, on_delete=models.CASCADE, related_name='pets')
    name = models.CharField(max_length=100)
    chip_number = models.CharField(max_length=100, unique=True)
    breed = models.CharField(max_length=100)
    species = models.CharField(max_length=100)
    acquisition_date = models.DateTimeField()
    birth_date = models.DateTimeField(blank=True, null=True)
    origin = models.CharField(max_length=100)
    background = models.TextField(blank=True, null=True)
    has_vaccinations = models.BooleanField(default=False)
    has_diseases = models.BooleanField(default=False)
    disease_notes = models.TextField(blank=True, null=True)
    last_vet_visit = models.DateTimeField(blank=True, null=True)
    kitty_paw_device = models.OneToOneField(Device, on_delete=models.SET_NULL, blank=True, null=True, to_field='device_id', db_column='kitty_paw_device_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.species} ({self.owner.name})"
