import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { format } from 'date-fns';

// Función para mostrar nombres más amigables para los dispositivos
const getDeviceDisplayName = (deviceId: string): string => {
  const deviceMap: Record<string, string> = {
    'kpcl0021': 'Collar Malto',
    'kpcl0022': 'Collar Luna',
  };
  
  // Normalizar el ID del dispositivo para la búsqueda
  const normalizedDeviceId = deviceId.toLowerCase();
  // Usar el nombre amigable si existe, o el nombre original
  return deviceMap[normalizedDeviceId] || deviceId;
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
  colorScheme = ['#3f51b5', '#ff4081', '#4caf50', '#ff9800'],
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
    
    // Generate labels (time labels)
    const now = new Date();
    const labels = Array.from({ length: 9 }, (_, i) => {
      const d = new Date(now);
      d.setMinutes(d.getMinutes() - 8 + i);
      return format(d, 'HH:mm:ss');
    });
    
    // Generate datasets (solo para los dispositivos filtrados)
    const datasets = Object.entries(deviceReadings).map(([deviceId, data], index) => {
      // Si hay un filtro de dispositivo y este no es el dispositivo, ignorar
      if (deviceFilter && deviceId.toLowerCase() !== deviceFilter.toLowerCase()) {
        return null;
      }
      
      return {
        label: getDeviceDisplayName(deviceId),
        // Inicializar con un array de valores nulos - se actualizarán con datos reales
        data: Array(9).fill(null),
        borderColor: colorScheme[index % colorScheme.length],
        backgroundColor: `${colorScheme[index % colorScheme.length]}1A`, // Add 10% opacity
        tension: 0.3,
        fill: chartType === 'line',
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
        // Limitar el tamaño del historial a 30 elementos
        if (updatedHistory[reading.deviceId].length >= 30) {
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
    
    // Actualizar etiquetas con las últimas marcas de tiempo
    const timeLabels = [];
    const now = new Date();
    
    // Si hay un filtro de dispositivo, usar ese dispositivo para las etiquetas de tiempo
    // Si no, usar el primer dispositivo disponible en el historial
    const deviceToUse = deviceFilter ? 
      Object.keys(readingsHistory).find(d => d.toLowerCase() === deviceFilter.toLowerCase()) :
      Object.keys(readingsHistory)[0];
    
    if (deviceToUse && readingsHistory[deviceToUse] && readingsHistory[deviceToUse].length > 0) {
      const deviceHistory = readingsHistory[deviceToUse];
      // Obtener las últimas 9 marcas de tiempo o menos si no hay suficientes
      const numLabels = Math.min(9, deviceHistory.length);
      
      for (let i = deviceHistory.length - numLabels; i < deviceHistory.length; i++) {
        if (deviceHistory[i]) {
          const timestamp = new Date(deviceHistory[i].timestamp);
          timeLabels.push(format(timestamp, 'HH:mm:ss'));
        }
      }
      
      // Si no tenemos suficientes etiquetas, rellenamos con valores de tiempo actuales
      while (timeLabels.length < 9) {
        const timestamp = new Date(now);
        timestamp.setMinutes(timestamp.getMinutes() - (9 - timeLabels.length));
        timeLabels.unshift(format(timestamp, 'HH:mm:ss'));
      }
    } else {
      // Usar etiquetas de tiempo generadas
      for (let i = 0; i < 9; i++) {
        const timestamp = new Date(now);
        timestamp.setMinutes(timestamp.getMinutes() - (8 - i));
        timeLabels.push(format(timestamp, 'HH:mm:ss'));
      }
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
            data: Array(9).fill(null),
            borderColor: colorScheme[0],
            backgroundColor: `${colorScheme[0]}1A`,
            tension: 0.3,
            fill: chartType === 'line',
          });
        }
      }
    } 
    // Si el filtro es "all", asegurarse de que estén todos los dispositivos representados
    else if (deviceFilter === 'all') {
      // Eliminar datasets que puedan estar duplicados
      const existingLabels = new Set(chart.data.datasets.map(ds => ds.label));
      
      // Añadir datasets para dispositivos que no tengan uno
      Object.keys(readingsHistory).forEach((deviceId, index) => {
        if (!existingLabels.has(getDeviceDisplayName(deviceId)) && readingsHistory[deviceId].length > 0) {
          const colorIndex = chart.data.datasets.length % colorScheme.length;
          chart.data.datasets.push({
            label: getDeviceDisplayName(deviceId),
            data: Array(9).fill(null),
            borderColor: colorScheme[colorIndex],
            backgroundColor: `${colorScheme[colorIndex]}1A`,
            tension: 0.3,
            fill: chartType === 'line',
          });
        }
      });
    }
    
    // Actualizar cada conjunto de datos con los datos del historial
    Object.entries(readingsHistory).forEach(([deviceId, deviceReadings]) => {
      // Si hay filtro de dispositivo específico (no "all") y este no es el dispositivo, ignorar
      if (deviceFilter && deviceFilter !== 'all' && deviceId.toLowerCase() !== deviceFilter.toLowerCase()) {
        return;
      }
      
      // Buscar el índice del conjunto de datos para este dispositivo
      let datasetIndex = chart.data.datasets.findIndex(ds => ds.label === getDeviceDisplayName(deviceId));
      
      // Si no existe el dataset para este dispositivo, lo creamos
      if (datasetIndex === -1 && deviceReadings.length > 0) {
        const colorIndex = chart.data.datasets.length % colorScheme.length;
        const newDataset = {
          label: getDeviceDisplayName(deviceId),
          data: Array(9).fill(null),
          borderColor: colorScheme[colorIndex],
          backgroundColor: `${colorScheme[colorIndex]}1A`,
          tension: 0.3,
          fill: chartType === 'line',
        };
        chart.data.datasets.push(newDataset);
        datasetIndex = chart.data.datasets.length - 1;
      }
      
      if (datasetIndex !== -1) {
        // Preparar los datos para el gráfico (últimos 9 valores o menos)
        const numDataPoints = Math.min(9, deviceReadings.length);
        const values = [];
        
        for (let i = deviceReadings.length - numDataPoints; i < deviceReadings.length; i++) {
          if (deviceReadings[i]) {
            values.push(deviceReadings[i].value);
          }
        }
        
        // Rellenar con nulos si no tenemos suficientes valores
        while (values.length < 9) {
          values.unshift(null);
        }
        
        chart.data.datasets[datasetIndex].data = values;
      }
    });
    
    chart.update();
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
