import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { format } from 'date-fns';

// Función para mostrar nombres más amigables para los dispositivos
const getDeviceDisplayName = (deviceId: string): string => {
  const deviceMap: Record<string, string> = {
    'kpcl0021': 'Collar de Malto',
    'kpcl0022': 'Placa de Canela',
  };
  
  // Normalizar el ID del dispositivo para la búsqueda
  const normalizedDeviceId = deviceId.toLowerCase();
  // Usar el nombre amigable si existe, o el nombre original
  return deviceMap[normalizedDeviceId] 
    ? `${deviceMap[normalizedDeviceId]} (${deviceId})` 
    : deviceId;
};

// Ordenamiento consistente de dispositivos para mantener leyendas estables
const getOrderedDeviceList = (devices: string[]): string[] => {
  // Definimos un orden fijo de dispositivos conocidos
  const deviceOrder: Record<string, number> = {
    'kpcl0021': 1, // Collar de Malto siempre primero
    'kpcl0022': 2  // Placa de Canela siempre segundo
  };
  
  return [...devices].sort((a, b) => {
    const orderA = deviceOrder[a.toLowerCase()] || 999;
    const orderB = deviceOrder[b.toLowerCase()] || 999;
    return orderA - orderB;
  });
};

interface SensorChartProps {
  title: string;
  sensorType: string;
  chartType?: 'line' | 'bar';
  height?: string;
  colorScheme?: string[];
  deviceFilter?: string; // Para filtrar por dispositivo específico
}

export default function SensorChart({ 
  title, 
  sensorType, 
  chartType = 'line', 
  height = 'h-64',
  colorScheme = ['#FF847C', '#99B898', '#A8E6CE', '#FECEAB', '#E84A5F', '#6C5B7B'],
  deviceFilter
}: SensorChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { latestReadings } = useWebSocket();
  
  // Mantener un historial de lecturas por dispositivo con persistencia
  const [readingsHistory, setReadingsHistory] = useState<Record<string, any[]>>(() => {
    // Intentar cargar el historial desde localStorage
    const savedHistory = localStorage.getItem(`sensor_history_${sensorType}`);
    return savedHistory ? JSON.parse(savedHistory) : {};
  });
  
  // Filter readings by sensor type and device if specified
  const filteredReadings = latestReadings.filter(reading => {
    // Primero verificar que el tipo de sensor coincide
    const matchesSensorType = reading.sensorType === sensorType;
    if (!matchesSensorType) return false;
    
    // Si hay un filtro de dispositivo y no es "all", aplicarlo
    if (deviceFilter && deviceFilter !== 'all') {
      return reading.deviceId.toLowerCase() === deviceFilter.toLowerCase();
    }
    
    // Si no hay filtro o el filtro es "all", incluir todos los tipos de sensores coincidentes
    return true;
  });

  // Esto recreará el gráfico cada vez que cambie el filtro de dispositivo
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Forzar la recreación del gráfico cuando cambia el filtro
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    
    // La recreación se hará en el siguiente efecto
  }, [deviceFilter]);
  
  // Usamos la función getDeviceDisplayName definida fuera del componente

  // Crear o actualizar el gráfico
  useEffect(() => {
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Group readings by device (solo los filtrados)
    const deviceReadings: Record<string, any[]> = {};
    filteredReadings.forEach(reading => {
      if (!deviceReadings[reading.deviceId]) {
        deviceReadings[reading.deviceId] = [];
      }
      deviceReadings[reading.deviceId].push(reading);
    });
    
    // Generate labels (time labels) - escala de 4 horas, con puntos cada 10 minutos (24 puntos)
    const now = new Date();
    const labels = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(now);
      d.setMinutes(d.getMinutes() - 240 + (i * 10)); // 4 horas = 240 minutos
      return format(d, 'HH:mm');
    });
    
    // Función para asignar colores fijos a dispositivos (global al componente)
    const getDeviceColorIndex = (deviceId: string): number => {
      // Mapeo fijo de dispositivos a índices de colores
      const colorMapping: Record<string, number> = {
        'kpcl0021': 0, // Collar de Malto: rojo suave
        'kpcl0022': 1, // Placa de Canela: verde suave
      };
      
      const normalizedDeviceId = deviceId.toLowerCase();
      return colorMapping[normalizedDeviceId] !== undefined 
        ? colorMapping[normalizedDeviceId] 
        : Math.abs(normalizedDeviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colorScheme.length;
    };
    
    // Generate datasets (solo para los dispositivos filtrados, en orden consistente)
    const orderedDeviceEntries: Array<[string, any[]]> = getOrderedDeviceList(Object.keys(deviceReadings))
      .map(deviceId => [deviceId, deviceReadings[deviceId]]);
      
    const datasets = orderedDeviceEntries.map(([deviceId, data]) => {
      // Si hay un filtro de dispositivo y este no es el dispositivo, ignorar
      if (deviceFilter && deviceId.toLowerCase() !== deviceFilter.toLowerCase()) {
        return null;
      }
      
      const colorIdx = getDeviceColorIndex(deviceId);
      
      return {
        label: getDeviceDisplayName(deviceId),
        // Inicializar con un array de valores nulos - se actualizarán con datos reales
        data: Array(24).fill(null), // 24 puntos para 4 horas (1 cada 10 min)
        borderColor: colorScheme[colorIdx],
        backgroundColor: 'transparent',  // Sin fondo
        borderWidth: 2,
        tension: 0.3,
        fill: false, // No rellenar área bajo la curva
      };
    }).filter(Boolean);
    
    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: datasets as any[],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            display: !deviceFilter || deviceFilter === 'all', // Mostrar leyenda para "all" o sin filtro
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            title: {
              display: true,
              text: sensorType === 'temperature' ? 'Temperatura (°C)' : 
                   sensorType === 'humidity' ? 'Humedad (%)' : 
                   sensorType === 'light' ? 'Intensidad de Luz (lux)' : 
                   sensorType === 'weight' ? 'Peso (g)' : 'Valor',
            },
            suggestedMin: sensorType === 'temperature' ? 15 : 
                         sensorType === 'humidity' ? 30 : 
                         sensorType === 'light' ? 0 : 
                         sensorType === 'weight' ? 0 : 0,
            suggestedMax: sensorType === 'temperature' ? 30 : 
                         sensorType === 'humidity' ? 80 : 
                         sensorType === 'light' ? 1500 : 
                         sensorType === 'weight' ? 600 : 100,
          },
          x: {
            title: {
              display: true,
              text: 'Tiempo',
            }
          }
        },
        // Configuración de animaciones más suaves
        animation: {
          duration: 800, // Duración más larga para transiciones más suaves
          easing: 'easeOutQuad', // Curva de easing más suave
        },
        transitions: {
          active: {
            animation: {
              duration: 800
            }
          }
        },
        elements: {
          line: {
            tension: 0.4 // Más curva para líneas más suaves
          },
          point: {
            radius: 3,
            hoverRadius: 5
          }
        }
      }
    });
    
    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [filteredReadings, sensorType, chartType, colorScheme, deviceFilter]);
  
  // Actualizar el historial de lecturas cuando cambien los datos
  useEffect(() => {
    if (filteredReadings.length === 0) return;
    
    // Agrupar por dispositivo y actualizar el historial
    const updatedHistory = { ...readingsHistory };
    
    filteredReadings.forEach(reading => {
      // Si hay un filtro de dispositivo y no es "all", solo procesar ese dispositivo
      if (deviceFilter && deviceFilter !== 'all' && reading.deviceId.toLowerCase() !== deviceFilter.toLowerCase()) {
        return;
      }
      
      if (!updatedHistory[reading.deviceId]) {
        updatedHistory[reading.deviceId] = [];
      }
      
      // Añadir la lectura actual al historial si es nueva
      const existingIndex = updatedHistory[reading.deviceId].findIndex(
        (r: any) => r.timestamp === reading.timestamp
      );
      
      if (existingIndex === -1) {
        // Limitar el tamaño del historial a 240 elementos (para 4 horas)
        if (updatedHistory[reading.deviceId].length >= 240) {
          updatedHistory[reading.deviceId].shift();
        }
        updatedHistory[reading.deviceId].push(reading);
      }
    });
    
    setReadingsHistory(updatedHistory);
    
    // Guardar el historial actualizado en localStorage
    localStorage.setItem(`sensor_history_${sensorType}`, JSON.stringify(updatedHistory));
  }, [latestReadings, sensorType, deviceFilter]);
  
  // Actualizar el gráfico con los datos del historial
  useEffect(() => {
    if (!chartInstance.current || Object.keys(readingsHistory).length === 0) return;
    
    const chart = chartInstance.current;
    
    // Generar etiquetas de tiempo para un período de 4 horas (24 puntos, cada 10 minutos)
    const timeLabels = [];
    const now = new Date();
    
    // Generar etiquetas de tiempo de las últimas 4 horas en intervalos de 10 minutos
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      // Retroceder 4 horas (240 minutos) y avanzar de 10 en 10 minutos
      timestamp.setMinutes(timestamp.getMinutes() - 240 + (i * 10));
      timeLabels.push(format(timestamp, 'HH:mm'));
    }
    
    chart.data.labels = timeLabels;
    
    // Si hay un filtro específico de dispositivo, mostrar solo ese dispositivo
    if (deviceFilter && deviceFilter !== 'all') {
      // Primero eliminar cualquier dataset que no sea del dispositivo filtrado
      // Usamos el nombre mostrado (getDeviceDisplayName) para la comparación
      chart.data.datasets = chart.data.datasets.filter(ds => 
        ds.label && ds.label === getDeviceDisplayName(deviceFilter)
      );
      
      // Si no hay datasets para este dispositivo, añadir uno
      if (chart.data.datasets.length === 0) {
        // Buscar el dispositivo en el historial
        const deviceId = Object.keys(readingsHistory).find(
          d => d.toLowerCase() === deviceFilter.toLowerCase()
        );
        
        if (deviceId) {
          chart.data.datasets.push({
            label: getDeviceDisplayName(deviceId),
            data: Array(24).fill(null),
            borderColor: colorScheme[0],
            backgroundColor: 'transparent',
            tension: 0.3,
            fill: false,
          });
        }
      }
    } 
    // Si el filtro es "all", asegurarse de que estén todos los dispositivos representados
    else if (deviceFilter === 'all') {
      // Función para asignar colores fijos a dispositivos
      const getDeviceColorIndex = (deviceId: string): number => {
        // Mapeo fijo de dispositivos a índices de colores
        const colorMapping: Record<string, number> = {
          'kpcl0021': 0, // Collar de Malto: rojo suave
          'kpcl0022': 1, // Placa de Canela: verde suave
        };
        
        const normalizedDeviceId = deviceId.toLowerCase();
        return colorMapping[normalizedDeviceId] !== undefined 
          ? colorMapping[normalizedDeviceId] 
          : Math.abs(normalizedDeviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colorScheme.length;
      };
      
      // Eliminar datasets que puedan estar duplicados
      const existingLabels = new Set(chart.data.datasets.map(ds => ds.label));
      
      // Añadir datasets para dispositivos que no tengan uno, en orden consistente
      // Ordenar los dispositivos para mantener el orden de las leyendas consistente
      const orderedDevices = getOrderedDeviceList(Object.keys(readingsHistory));
      orderedDevices.forEach((deviceId) => {
        if (!existingLabels.has(getDeviceDisplayName(deviceId)) && readingsHistory[deviceId].length > 0) {
          const colorIdx = getDeviceColorIndex(deviceId);
          chart.data.datasets.push({
            label: getDeviceDisplayName(deviceId),
            data: Array(24).fill(null),
            borderColor: colorScheme[colorIdx],
            backgroundColor: 'transparent',
            borderWidth: 2, 
            tension: 0.3,
            fill: false,
          });
        }
      });
    }
    
    // Actualizar cada conjunto de datos con los datos del historial, en orden consistente
    const orderedDeviceEntries: Array<[string, any[]]> = getOrderedDeviceList(Object.keys(readingsHistory))
      .map(deviceId => [deviceId, readingsHistory[deviceId]]);
    
    orderedDeviceEntries.forEach(([deviceId, deviceReadings]) => {
      // Si hay filtro de dispositivo específico (no "all") y este no es el dispositivo, ignorar
      if (deviceFilter && deviceFilter !== 'all' && deviceId.toLowerCase() !== deviceFilter.toLowerCase()) {
        return;
      }
      
      // Buscar el índice del conjunto de datos para este dispositivo
      let datasetIndex = chart.data.datasets.findIndex(ds => ds.label === getDeviceDisplayName(deviceId));
      
      // Si no existe el dataset para este dispositivo, lo creamos
      if (datasetIndex === -1 && deviceReadings.length > 0) {
        // Función para asignar colores fijos a dispositivos
        const getDeviceColorIndex = (deviceId: string): number => {
          // Mapeo fijo de dispositivos a índices de colores
          const colorMapping: Record<string, number> = {
            'kpcl0021': 0, // Collar de Malto: rojo suave
            'kpcl0022': 1, // Placa de Canela: verde suave
          };
          
          const normalizedDeviceId = deviceId.toLowerCase();
          return colorMapping[normalizedDeviceId] !== undefined 
            ? colorMapping[normalizedDeviceId] 
            : Math.abs(normalizedDeviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colorScheme.length;
        };
        
        const colorIdx = getDeviceColorIndex(deviceId);
        const newDataset = {
          label: getDeviceDisplayName(deviceId),
          data: Array(24).fill(null),
          borderColor: colorScheme[colorIdx],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        };
        chart.data.datasets.push(newDataset);
        datasetIndex = chart.data.datasets.length - 1;
      }
      
      if (datasetIndex !== -1) {
        // Preparar los datos para el gráfico (últimos 24 valores para 4 horas)
        const numDataPoints = Math.min(24, deviceReadings.length);
        const values = [];
        
        for (let i = deviceReadings.length - numDataPoints; i < deviceReadings.length; i++) {
          if (deviceReadings[i]) {
            values.push(deviceReadings[i].value);
          }
        }
        
        // Rellenar con nulos si no tenemos suficientes valores
        while (values.length < 24) {
          values.unshift(null);
        }
        
        chart.data.datasets[datasetIndex].data = values;
      }
    });
    
    // Actualizar el gráfico con una transición suave
    chart.update('none');
  }, [readingsHistory, chartType, colorScheme, deviceFilter]);
  
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center">
        <h3 className="font-medium">
          {title}
          {deviceFilter && deviceFilter !== 'all' && (
            <span className="ml-2 text-sm text-gray-500">
              ({getDeviceDisplayName(deviceFilter)})
            </span>
          )}
          {deviceFilter === 'all' && (
            <span className="ml-2 text-sm text-gray-500">
              (Todos los dispositivos)
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          <button className="p-1.5 rounded-md hover:bg-neutral-100">
            <span className="material-icons text-neutral-500 text-xl">fullscreen</span>
          </button>
          <button className="p-1.5 rounded-md hover:bg-neutral-100">
            <span className="material-icons text-neutral-500 text-xl">more_vert</span>
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className={height}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </Card>
  );
}
