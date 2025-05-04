from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'devices', views.DeviceViewSet)
router.register(r'pet-owners', views.PetOwnerViewSet)
router.register(r'pets', views.PetViewSet)

urlpatterns = [
    # Incluir rutas generadas por el router
    path('', include(router.urls)),
    
    # Rutas de autenticación
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('user/current/', views.CurrentUserView.as_view(), name='current-user'),
    
    # Rutas para datos de sensores
    path('sensor-data/<str:device_id>/', views.SensorDataView.as_view(), name='sensor-data'),
    path('latest-readings/', views.LatestReadingsView.as_view(), name='latest-readings'),
    
    # Rutas para MQTT
    path('mqtt/status/', views.MqttStatusView.as_view(), name='mqtt-status'),
    path('mqtt/connect/', views.MqttConnectView.as_view(), name='mqtt-connect'),
    path('mqtt/subscribe/', views.MqttSubscribeView.as_view(), name='mqtt-subscribe'),
    
    # Rutas para mascotas específicas
    path('pet-owners/<int:owner_id>/pets/', views.PetViewSet.as_view({'get': 'list'}), name='owner-pets'),
    path('devices/<str:device_id>/pet/', views.PetByDeviceView.as_view(), name='device-pet'),
    
    # Rutas para información del sistema
    path('system/metrics/', views.SystemMetricsView.as_view(), name='system-metrics'),
    path('system/info/', views.SystemInfoView.as_view(), name='system-info'),
]