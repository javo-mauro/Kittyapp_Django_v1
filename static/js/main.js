// KittyPawSensors - Script principal

// Variables globales
let webSocket = null;
let devices = [];
let sensorData = {};
let selectedDevice = 'all';
let charts = {};
let currentUser = null; // Almacena la información del usuario actual

// Colores para gráficos
const chartColors = {
  temperature: '#FF5F6D',
  humidity: '#38B6FF',
  light: '#FFC371',
  weight: '#8C54FF'
};

// Nombres de dispositivos
const deviceNames = {
  'KPCL0021': 'Collar de Malto',
  'KPCL0022': 'Placa de Canela',
  'KPCL0025': 'Collar de Firulais'
};

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Obtener información del usuario actual
  fetchCurrentUser().then(() => {
    // Configurar selectores y botones
    setupEventListeners();
    
    // Conectar a WebSocket
    connectWebSocket();
    
    // Inicializar gráficos
    initCharts();
    
    // Cargar dispositivos y datos de sensores
    loadInitialData();
  });
});

// Configura los listeners de eventos
function setupEventListeners() {
  // Selector de dispositivo
  const deviceSelector = document.getElementById('deviceSelector');
  if (deviceSelector) {
    deviceSelector.addEventListener('change', (e) => {
      selectedDevice = e.target.value;
      updateCharts();
    });
  }
  
  // Botón de logout
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      fetch('/api/auth/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      })
      .then(response => {
        if (response.ok) {
          window.location.href = '/login/';
        }
      })
      .catch(error => console.error('Error al cerrar sesión:', error));
    });
  }
}

// Conecta con el WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/sensor-data/`;
  
  webSocket = new WebSocket(wsUrl);
  
  webSocket.onopen = () => {
    console.log('Conexión WebSocket establecida');
    
    // Suscribirse a temas MQTT
    webSocket.send(JSON.stringify({
      type: 'subscribe',
      topic: 'KPCL0021'
    }));
    
    webSocket.send(JSON.stringify({
      type: 'subscribe',
      topic: 'KPCL0022'
    }));
  };
  
  webSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    processWebSocketMessage(data);
  };
  
  webSocket.onclose = () => {
    console.log('Conexión WebSocket cerrada');
    // Intentar reconectar después de un tiempo
    setTimeout(connectWebSocket, 3000);
  };
  
  webSocket.onerror = (error) => {
    console.error('Error de WebSocket:', error);
  };
}

// Procesa los mensajes recibidos por WebSocket
function processWebSocketMessage(data) {
  switch (data.type) {
    case 'devices':
      devices = data.data;
      updateDeviceList();
      break;
      
    case 'sensorData':
      if (Array.isArray(data.data)) {
        for (const sensorGroup of data.data) {
          const deviceId = sensorGroup.deviceId;
          const sensorType = sensorGroup.sensorType;
          
          if (!sensorData[deviceId]) {
            sensorData[deviceId] = {};
          }
          
          sensorData[deviceId][sensorType] = sensorGroup.data;
        }
      } else if (data.data && data.data.device_id) {
        const deviceId = data.data.device_id;
        
        // Actualizar datos del sensor individual
        for (const sensorType of ['temperature', 'humidity', 'light', 'weight']) {
          if (data.data[sensorType] !== undefined) {
            if (!sensorData[deviceId]) {
              sensorData[deviceId] = {};
            }
            
            if (!sensorData[deviceId][sensorType]) {
              sensorData[deviceId][sensorType] = [];
            }
            
            // Añadir nueva lectura
            sensorData[deviceId][sensorType].push({
              value: parseFloat(data.data[sensorType]),
              unit: getSensorUnit(sensorType),
              timestamp: data.data.timestamp || new Date().toISOString()
            });
            
            // Mantener solo las últimas 60 lecturas
            if (sensorData[deviceId][sensorType].length > 60) {
              sensorData[deviceId][sensorType].shift();
            }
          }
        }
      }
      
      updateCharts();
      break;
      
    case 'deviceStatus':
      updateDeviceStatus(data.deviceId, data.status);
      break;
      
    case 'subscription_success':
      console.log(`Suscrito a ${data.topic}`);
      break;
      
    default:
      console.log('Mensaje no procesado:', data);
  }
}

// Actualiza la lista de dispositivos
function updateDeviceList() {
  const deviceSelector = document.getElementById('deviceSelector');
  const devicesList = document.getElementById('devicesList');
  
  if (deviceSelector) {
    // Guardar la selección actual
    const currentSelection = deviceSelector.value;
    
    // Limpiar selector
    deviceSelector.innerHTML = '';
    
    // Opción para todos los dispositivos
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Todos los dispositivos';
    deviceSelector.appendChild(allOption);
    
    // Agregar dispositivos
    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.device_id;
      option.textContent = device.name || deviceNames[device.device_id] || device.device_id;
      deviceSelector.appendChild(option);
    });
    
    // Restaurar selección
    deviceSelector.value = currentSelection || 'all';
  }
  
  if (devicesList) {
    devicesList.innerHTML = '';
    
    devices.forEach(device => {
      const deviceId = device.device_id;
      const deviceName = device.name || deviceNames[deviceId] || deviceId;
      const status = device.status || 'unknown';
      
      const deviceItem = document.createElement('div');
      deviceItem.className = 'col-md-6 col-lg-4 mb-4';
      deviceItem.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${deviceName}</h5>
            <p class="card-text">
              <span class="device-status-${status.toLowerCase()}">
                <i class="bi ${status === 'online' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
                ${status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </p>
            <p class="card-text">
              <small class="text-muted">ID: ${deviceId}</small>
            </p>
            <p class="card-text">
              <small class="text-muted">Tipo: ${device.type || 'Desconocido'}</small>
            </p>
            <div class="progress mb-3" style="height: 20px;">
              <div class="progress-bar bg-success" role="progressbar" 
                style="width: ${device.battery_level || 0}%;" 
                aria-valuenow="${device.battery_level || 0}" 
                aria-valuemin="0" 
                aria-valuemax="100">
                ${device.battery_level || 0}% Batería
              </div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-primary" 
              onclick="selectDevice('${deviceId}')">
              Ver detalles
            </button>
          </div>
        </div>
      `;
      
      devicesList.appendChild(deviceItem);
    });
  }
}

// Actualiza el estado de un dispositivo
function updateDeviceStatus(deviceId, status) {
  // Actualizar en la lista de dispositivos
  for (let i = 0; i < devices.length; i++) {
    if (devices[i].device_id === deviceId) {
      devices[i].status = status;
      break;
    }
  }
  
  // Actualizar UI
  updateDeviceList();
}

// Inicializa los gráficos
function initCharts() {
  // Contenedores de gráficos
  const temperatureChartContainer = document.getElementById('temperatureChart');
  const humidityChartContainer = document.getElementById('humidityChart');
  const lightChartContainer = document.getElementById('lightChart');
  const weightChartContainer = document.getElementById('weightChart');
  
  // Si los contenedores existen, crear los gráficos
  if (temperatureChartContainer) {
    charts.temperature = new Chart(temperatureChartContainer, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Temperatura',
          data: [],
          borderColor: chartColors.temperature,
          backgroundColor: hexToRgba(chartColors.temperature, 0.1),
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      },
      options: getChartOptions('Temperatura', '°C', 0, 50)
    });
  }
  
  if (humidityChartContainer) {
    charts.humidity = new Chart(humidityChartContainer, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humedad',
          data: [],
          borderColor: chartColors.humidity,
          backgroundColor: hexToRgba(chartColors.humidity, 0.1),
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      },
      options: getChartOptions('Humedad', '%', 0, 100)
    });
  }
  
  if (lightChartContainer) {
    charts.light = new Chart(lightChartContainer, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Luz',
          data: [],
          borderColor: chartColors.light,
          backgroundColor: hexToRgba(chartColors.light, 0.1),
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      },
      options: getChartOptions('Luz', 'lux', 0, 500)
    });
  }
  
  if (weightChartContainer) {
    charts.weight = new Chart(weightChartContainer, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Peso',
          data: [],
          borderColor: chartColors.weight,
          backgroundColor: hexToRgba(chartColors.weight, 0.1),
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      },
      options: getChartOptions('Peso', 'g', 0, 500)
    });
  }
}

// Actualiza los gráficos con los datos actuales
function updateCharts() {
  // Para cada tipo de sensor
  for (const sensorType in charts) {
    // Datos combinados para todos los dispositivos o solo el seleccionado
    let combinedData = [];
    let datasets = [];
    
    // Limpiar datos de dispositivos que no pertenecen al usuario actual
    // El admin tiene acceso a todos los dispositivos
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // Para usuarios no admin, solo mostramos dispositivos autorizados
    // Obtener los IDs de los dispositivos autorizados para este usuario
    const authorizedDeviceIds = devices.map(d => d.deviceId || d.device_id).filter(id => id);
    
    // Limpiar los datos de sensorData para solo mantener dispositivos autorizados
    if (!isAdmin) {
      // Para cada dispositivo en sensorData, verificar si está autorizado
      for (const deviceId in sensorData) {
        if (!authorizedDeviceIds.includes(deviceId)) {
          // Si no está autorizado, eliminar de sensorData
          delete sensorData[deviceId];
        }
      }
    }
    
    if (selectedDevice === 'all') {
      // Mostrar datos de todos los dispositivos permitidos para el usuario
      for (const deviceId in sensorData) {
        if (sensorData[deviceId] && sensorData[deviceId][sensorType]) {
          const deviceName = deviceNames[deviceId] || deviceId;
          const color = getDeviceColor(deviceId);
          
          datasets.push({
            label: deviceName,
            data: sensorData[deviceId][sensorType].map(d => d.value),
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.1),
            borderWidth: 2,
            tension: 0.1,
            fill: true
          });
          
          // Usar el primer dispositivo para las etiquetas
          if (combinedData.length === 0 && sensorData[deviceId][sensorType].length > 0) {
            combinedData = sensorData[deviceId][sensorType];
          }
        }
      }
    } else {
      // Si es admin o si el dispositivo está autorizado para el usuario
      if ((isAdmin || authorizedDeviceIds.includes(selectedDevice)) && 
          sensorData[selectedDevice] && 
          sensorData[selectedDevice][sensorType]) {
        
        combinedData = sensorData[selectedDevice][sensorType];
        
        datasets = [{
          label: getSensorLabel(sensorType),
          data: combinedData.map(d => d.value),
          borderColor: chartColors[sensorType],
          backgroundColor: hexToRgba(chartColors[sensorType], 0.1),
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }];
      }
    }
    
    // Actualizar gráfico
    if (charts[sensorType]) {
      // Verificar que existan datos para actualizar el gráfico
      if (combinedData && combinedData.length > 0) {
        charts[sensorType].data.labels = combinedData.map(d => formatTimestamp(d.timestamp));
      } else {
        // Si no hay datos, usar etiquetas vacías
        charts[sensorType].data.labels = [];
      }
      
      // Actualizar los datasets (conjuntos de datos)
      charts[sensorType].data.datasets = datasets || [];
      
      // Actualizar el gráfico sin animación para mejor rendimiento
      try {
        charts[sensorType].update('none');
      } catch (error) {
        console.error(`Error al actualizar gráfico ${sensorType}:`, error);
        
        // Intentar reiniciar el gráfico si hay un error
        try {
          charts[sensorType].destroy();
          initCharts();
        } catch (e) {
          console.error('No se pudo reiniciar el gráfico:', e);
        }
      }
    }
  }
  
  // Actualizar detalles del dispositivo seleccionado
  updateDeviceDetails();
}

// Actualiza los detalles del dispositivo seleccionado
function updateDeviceDetails() {
  const deviceDetails = document.getElementById('deviceDetails');
  if (!deviceDetails) return;
  
  if (selectedDevice === 'all') {
    deviceDetails.innerHTML = '<h3>Todos los dispositivos</h3>';
    return;
  }
  
  // Buscar el dispositivo seleccionado
  const device = devices.find(d => d.device_id === selectedDevice);
  if (!device) return;
  
  // Formatear la última actualización
  let lastUpdate = 'Desconocido';
  if (device.last_update) {
    lastUpdate = new Date(device.last_update).toLocaleString();
  }
  
  deviceDetails.innerHTML = `
    <h3>${device.name || deviceNames[device.device_id] || device.device_id}</h3>
    <p><strong>ID:</strong> ${device.device_id}</p>
    <p><strong>Tipo:</strong> ${device.type || 'Desconocido'}</p>
    <p><strong>Estado:</strong> <span class="device-status-${device.status?.toLowerCase() || 'unknown'}">${device.status || 'Desconocido'}</span></p>
    <p><strong>Batería:</strong> ${device.battery_level || 0}%</p>
    <p><strong>Última actualización:</strong> ${lastUpdate}</p>
  `;
}

// Función para seleccionar un dispositivo (llamada desde el botón en la tarjeta)
function selectDevice(deviceId) {
  const deviceSelector = document.getElementById('deviceSelector');
  if (deviceSelector) {
    deviceSelector.value = deviceId;
    selectedDevice = deviceId;
    updateCharts();
  }
}

// Devuelve opciones para configuración de gráficos
function getChartOptions(title, unit, min, max) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tiempo'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: unit
        },
        min: min,
        max: max,
        suggestedMax: max
      }
    },
    animation: {
      duration: 0 // Sin animación para rendimiento
    }
  };
}

// Funciones Utilitarias

// Formatea un timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return timestamp;
  }
}

// Convierte código HEX a RGBA
function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  
  // Expandir forma abreviada (por ejemplo, #03F a #0033FF)
  let r, g, b;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  if (result) {
    r = parseInt(result[1], 16);
    g = parseInt(result[2], 16);
    b = parseInt(result[3], 16);
  } else {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Devuelve etiqueta para cada tipo de sensor
function getSensorLabel(sensorType) {
  const labels = {
    temperature: 'Temperatura',
    humidity: 'Humedad',
    light: 'Luz',
    weight: 'Peso'
  };
  
  return labels[sensorType] || sensorType;
}

// Devuelve unidad para cada tipo de sensor
function getSensorUnit(sensorType) {
  const units = {
    temperature: '°C',
    humidity: '%',
    light: 'lux',
    weight: 'g'
  };
  
  return units[sensorType] || '';
}

// Devuelve un color para cada dispositivo
function getDeviceColor(deviceId) {
  const colors = {
    'KPCL0021': '#FF5F6D',
    'KPCL0022': '#38B6FF',
    'KPCL0025': '#50C878'  // Verde esmeralda para el collar de Firulais
  };
  
  return colors[deviceId] || '#8C54FF';
}

// Obtiene la información del usuario actual
async function fetchCurrentUser() {
  try {
    // Utilizar parámetro de url si está disponible, para propósitos de desarrollo
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    
    const response = await fetch('/api/user/current' + (urlUserId ? `?userId=${urlUserId}` : ''));
    
    if (response.ok) {
      currentUser = await response.json();
      console.log('Usuario actual:', currentUser);
      
      // Actualizar información de usuario en la interfaz
      updateUserInfo();
      
      return currentUser;
    } else {
      console.error('Error al obtener el usuario actual:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    return null;
  }
}

// Carga los datos iniciales (dispositivos, mascotas, etc.)
async function loadInitialData() {
  if (!currentUser) {
    console.warn('No hay usuario autenticado, no se pueden cargar datos');
    return;
  }
  
  try {
    // Limpiar los datos existentes
    sensorData = {};
    devices = [];
    
    // Cargar dispositivos con parámetros de usuario
    const userId = currentUser.id;
    const userRole = currentUser.role;
    console.log(`Cargando datos para usuario: ${userId}, rol: ${userRole}`);
    
    // Cargar dispositivos
    const devicesResponse = await fetch(`/api/devices?userId=${userId}&role=${userRole}`);
    if (devicesResponse.ok) {
      devices = await devicesResponse.json();
      console.log('Dispositivos autorizados:', devices.map(d => d.device_id || d.deviceId));
      updateDeviceList();
    } else {
      console.error('Error al cargar dispositivos:', devicesResponse.status);
    }
    
    // Si estamos en la página de mascotas, cargar datos de mascotas
    const petsContainer = document.getElementById('petsList');
    if (petsContainer) {
      const petsResponse = await fetch(`/api/pets?userId=${userId}&role=${userRole}`);
      if (petsResponse.ok) {
        const pets = await petsResponse.json();
        updatePetsList(pets);
      }
    }
    
    // Cargar datos de sensores para cada dispositivo
    for (const device of devices) {
      const deviceId = device.device_id || device.deviceId;
      if (!deviceId) continue;
      
      console.log(`Cargando datos de sensor para dispositivo: ${deviceId}`);
      try {
        const sensorDataResponse = await fetch(`/api/sensor-data/${deviceId}?userId=${userId}&role=${userRole}`);
        
        if (sensorDataResponse.ok) {
          const sensorDataResult = await sensorDataResponse.json();
          if (Array.isArray(sensorDataResult)) {
            processSensorData(deviceId, sensorDataResult);
          } else {
            console.warn(`Formato de datos incorrecto para ${deviceId}:`, sensorDataResult);
          }
        } else {
          console.error(`Error al cargar datos del sensor para ${deviceId}:`, sensorDataResponse.status);
        }
      } catch (error) {
        console.error(`Excepción al cargar datos del sensor para ${deviceId}:`, error);
      }
    }
    
    // Actualizar gráficos
    updateCharts();
    
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error);
  }
}

// Actualiza la información del usuario en la interfaz
function updateUserInfo() {
  // Actualizar nombre del usuario en el navbar
  const userNameElement = document.querySelector('.navbar-nav .text-light');
  if (userNameElement && currentUser) {
    userNameElement.textContent = currentUser.name || currentUser.username;
  }
}

// Procesa los datos de sensores recibidos de la API
function processSensorData(deviceId, data) {
  if (!deviceId || !Array.isArray(data)) {
    console.warn("Datos de sensor inválidos:", deviceId, data);
    return;
  }
  
  if (!sensorData[deviceId]) {
    sensorData[deviceId] = {};
  }
  
  // Agrupar datos por tipo de sensor
  for (const reading of data) {
    try {
      // Verificar que la lectura tiene el formato esperado
      if (!reading || !reading.sensor_type || !reading.data) {
        console.warn(`Lectura inválida para dispositivo ${deviceId}:`, reading);
        continue;
      }
      
      const sensorType = reading.sensor_type;
      
      if (!sensorData[deviceId][sensorType]) {
        sensorData[deviceId][sensorType] = [];
      }
      
      // Convertir datos a formato compatible, con validación
      const value = parseFloat(reading.data.value);
      if (isNaN(value)) {
        console.warn(`Valor no numérico para sensor ${sensorType}:`, reading.data.value);
        continue;
      }
      
      sensorData[deviceId][sensorType].push({
        value: value,
        unit: reading.data.unit || getSensorUnit(sensorType),
        timestamp: reading.timestamp || new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error al procesar lectura para dispositivo ${deviceId}:`, error);
    }
  }
  
  // Ordenar por timestamp
  for (const sensorType in sensorData[deviceId]) {
    try {
      sensorData[deviceId][sensorType].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateA - dateB;
      });
      
      // Limitar a las últimas 60 lecturas
      if (sensorData[deviceId][sensorType].length > 60) {
        sensorData[deviceId][sensorType] = sensorData[deviceId][sensorType].slice(-60);
      }
    } catch (error) {
      console.error(`Error al ordenar datos del sensor ${sensorType}:`, error);
    }
  }
}

// Actualiza la lista de mascotas (para la página de mascotas)
function updatePetsList(pets) {
  const petsList = document.getElementById('petsList');
  if (!petsList) return;
  
  petsList.innerHTML = '';
  
  if (pets.length === 0) {
    petsList.innerHTML = '<div class="col-12"><p class="text-center">No tienes mascotas registradas.</p></div>';
    return;
  }
  
  // Crear tarjetas para cada mascota
  pets.forEach(pet => {
    const petCard = document.createElement('div');
    petCard.className = 'col-md-6 col-lg-4 mb-4';
    
    // Si el dispositivo está conectado, mostrar status
    let deviceStatus = '';
    if (pet.kittyPawDeviceId) {
      const device = devices.find(d => d.device_id === pet.kittyPawDeviceId);
      if (device) {
        const status = device.status || 'unknown';
        deviceStatus = `
          <p class="mb-2">
            <span class="device-status-${status.toLowerCase()}">
              <i class="bi ${status === 'online' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
              Dispositivo ${status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </p>
        `;
      }
    }
    
    petCard.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${pet.name}</h5>
          <p class="card-text">
            <small class="text-muted">Especie: ${pet.species}</small>
          </p>
          <p class="card-text">
            <small class="text-muted">Raza: ${pet.breed}</small>
          </p>
          ${deviceStatus}
          <p class="card-text">
            <small class="text-muted">ID Chip: ${pet.chipNumber}</small>
          </p>
        </div>
        <div class="card-footer">
          <a href="/pets/${pet.id}/" class="btn btn-sm btn-primary">
            Ver detalles
          </a>
        </div>
      </div>
    `;
    
    petsList.appendChild(petCard);
  });
}