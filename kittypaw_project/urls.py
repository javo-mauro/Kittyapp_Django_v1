"""
URL configuration for kittypaw_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from kittypaw_app import views as kittypaw_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('kittypaw_app.urls')),
    path('api-auth/', include('rest_framework.urls')),
    
    # Rutas para las vistas de plantillas
    path('', kittypaw_views.index_view, name='index'),
    path('login/', kittypaw_views.login_view, name='login'),
    path('logout/', kittypaw_views.logout_view, name='logout'),
    path('devices/', kittypaw_views.devices_view, name='devices'),
    path('devices/<str:device_id>/', kittypaw_views.device_detail_view, name='device_detail'),
    path('pets/', kittypaw_views.pets_view, name='pets'),
    path('pets/<int:pet_id>/', kittypaw_views.pet_detail_view, name='pet_detail'),
]

# Configurar el servidor de medios estáticos durante el desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
