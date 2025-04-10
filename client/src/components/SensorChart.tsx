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

  // Crear o actualizar el gráfico
  useEffect(() => {
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Generar una grilla de etiquetas de tiempo completa - 60 puntos (1 hora completa)
    const now = new Date();
    const times: Date[] = [];
    
    // Crear 60 puntos de tiempo (uno por minuto) para cubrir una hora completa
    for (let i = 0; i < 60; i++) {
      const time = new Date(now);
      time.setMinutes(time.getMinutes() - 59 + i);
      time.setSeconds(0);
      time.setMilliseconds(0);
      times.push(time);
    }
    
    // Convertir a etiquetas con formato "HH:mm"
    const labels = times.map(time => format(time, 'HH:mm'));
    
    console.log(`Creando gráfico con ${labels.length} etiquetas de tiempo, desde ${labels[0]} hasta ${labels[labels.length-1]}`);
    
    // Group readings by device (solo los filtrados)
    const deviceReadings: Record<string, any[]> = {};
    filteredReadings.forEach(reading => {
      if (!deviceReadings[reading.deviceId]) {
        deviceReadings[reading.deviceId] = [];
      }
      deviceReadings[reading.deviceId].push(reading);
    });
    
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
    
    // Preparar los datasets para todos los dispositivos, incluso si no tienen datos
    // Esto asegura que siempre tengamos las líneas del gráfico inicializadas
    let datasets: any[] = [];
    
    // Si hay un filtro específico de dispositivo, solo incluir ese
    if (deviceFilter && deviceFilter !== 'all') {
      // Incluir solo el dispositivo filtrado
      const colorIdx = getDeviceColorIndex(deviceFilter);
      datasets = [{
        label: getDeviceDisplayName(deviceFilter),
        // Inicializar con array vacío - se llenará con los datos reales más adelante
        data: Array(60).fill(null),
        borderColor: colorScheme[colorIdx],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      }];
    } 
    // Si no hay filtro o el filtro es "all", incluir todos los dispositivos
    else {
      // Obtener todos los IDs de dispositivo y ordenarlos
      // Combinar los IDs de dispositivos de ambas fuentes de datos
      const deviceIds1 = Object.keys(deviceReadings);
      const deviceIds2 = Object.keys(readingsHistory);
      
      // Crear un array con todos los IDs únicos
      const deviceIdsSet = new Set<string>();
      deviceIds1.forEach(id => deviceIdsSet.add(id));
      deviceIds2.forEach(id => deviceIdsSet.add(id));
      
      // Convertir el set a array
      const allDeviceIds = Array.from(deviceIdsSet);
      
      // Ordenar los dispositivos para mantener el orden consistente
      const orderedDeviceIds = getOrderedDeviceList(allDeviceIds);
      
      // Crear un dataset para cada dispositivo
      datasets = orderedDeviceIds.map(deviceId => {
        const colorIdx = getDeviceColorIndex(deviceId);
        return {
          label: getDeviceDisplayName(deviceId),
          data: Array(60).fill(null), // Se llenará con los datos reales más adelante
          borderColor: colorScheme[colorIdx],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        };
      });
    }
    
    // Create the chart with complete time grid and empty datasets
    chartInstance.current = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets,
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
            beginAtZero: sensorType !== 'temperature',
            suggestedMin: sensorType === 'temperature' ? 20 : 
                         sensorType === 'humidity' ? 0 : 
                         sensorType === 'light' ? 0 : 
                         sensorType === 'weight' ? 0 : 0,
            suggestedMax: sensorType === 'temperature' ? 35 : 
                         sensorType === 'humidity' ? 100 : 
                         sensorType === 'light' ? 500 : 
                         sensorType === 'weight' ? 500 : 100,
            grace: '5%', // Añadir un pequeño margen
            ticks: {
              // Configuración de ticks más precisos para cada tipo de sensor
              precision: sensorType === 'weight' ? 1 : 1, // Precisión decimal normal para todos
              stepSize: sensorType === 'weight' ? 50 : // Pasos para peso en gramos
                        sensorType === 'temperature' ? 1 : // Grados
                        sensorType === 'humidity' ? 10 : // Porcentaje
                        sensorType === 'light' ? 50 : 10, // Intensidad de luz en lux
            },
          },
          x: {
            title: {
              display: true,
              text: 'Tiempo',
            }
          }
        },
        // Desactivar animaciones para que los datos se actualicen de inmediato
        animation: false,
        transitions: {
          active: {
            animation: {
              duration: 0
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
        // Mantener solo las lecturas de la última hora
        // En vez de limitar por cantidad, limitar por tiempo
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        
        // Filtrar el historial para mantener solo datos de la última hora
        updatedHistory[reading.deviceId] = updatedHistory[reading.deviceId]
          .filter((r: any) => new Date(r.timestamp) > oneHourAgo);
          
        // Añadir la nueva lectura
        updatedHistory[reading.deviceId].push(reading);
        
        // Ordenar cronológicamente (más antiguo primero)
        updatedHistory[reading.deviceId].sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    });
    
    setReadingsHistory(updatedHistory);
    
    // Guardar el historial actualizado en localStorage
    localStorage.setItem(`sensor_history_${sensorType}`, JSON.stringify(updatedHistory));
    
    // Mostrar cuántos datos tenemos por dispositivo (para depuración)
    Object.entries(updatedHistory).forEach(([deviceId, readings]) => {
      console.log(`Historial para ${deviceId}: ${readings.length} lecturas`);
    });
  }, [latestReadings, sensorType, deviceFilter]);
  
  // Actualizar el gráfico con los datos del historial
  useEffect(() => {
    if (!chartInstance.current || Object.keys(readingsHistory).length === 0) return;
    
    const chart = chartInstance.current;
    
    // El gráfico ya tiene las etiquetas completas para 1 hora (60 puntos)
    // No necesitamos regenerar las etiquetas, ya se crearon en la inicialización
    console.log(`Actualizando datos para el gráfico con ${chart.data.labels?.length || 0} etiquetas de tiempo`);
    
    // Mostrar valores para depuración
    if (chart.data.labels && chart.data.labels.length > 0) {
      const labels = chart.data.labels;
      console.log(`Etiquetas: ${labels.slice(0, 3).join(', ')} ... ${labels.slice(-3).join(', ')}`);
    }
    
    // Si hay un filtro específico de dispositivo, mostrar solo ese dispositivo
    if (deviceFilter && deviceFilter !== 'all') {
      // Primero eliminar cualquier dataset que no sea del dispositivo filtrado
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
            data: Array(60).fill(null),
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
      const orderedDevices = getOrderedDeviceList(Object.keys(readingsHistory));
      orderedDevices.forEach((deviceId) => {
        if (!existingLabels.has(getDeviceDisplayName(deviceId)) && readingsHistory[deviceId].length > 0) {
          const colorIdx = getDeviceColorIndex(deviceId);
          chart.data.datasets.push({
            label: getDeviceDisplayName(deviceId),
            data: Array(60).fill(null),
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
          data: Array(60).fill(null),
          borderColor: colorScheme[colorIdx],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        };
        chart.data.datasets.push(newDataset);
        datasetIndex = chart.data.datasets.length - 1;
      }
      
      if (datasetIndex !== -1 && chart.data.labels) {
        // Inicializar array de datos con nulos para todos los timestamps
        const labelsLength = chart.data.labels.length;
        const data = Array(labelsLength).fill(null);
        
        // Para cada lectura, encontrar su posición correspondiente en el array de etiquetas
        deviceReadings.forEach((reading: any) => {
          if (reading.timestamp && reading.value !== undefined && chart.data.labels) {
            // Formato de timestamp desde los datos: "10/04/2025, 00:29:05"
            const readingDate = new Date(reading.timestamp);
            const readingTime = format(readingDate, 'HH:mm');
            
            // Buscar índice de esta hora en las etiquetas
            const timeIndex = chart.data.labels.indexOf(readingTime);
            
            // Log para depurar
            if (deviceReadings.indexOf(reading) % 5 === 0) { // Log cada 5 lecturas para no saturar la consola
              console.log(`Asignando valor ${reading.value} a timestamp ${readingTime} (${reading.timestamp}), índice: ${timeIndex}`);
            }
            
            if (timeIndex !== -1) {
              // Coloca el valor en la posición correspondiente
              data[timeIndex] = reading.value;
            }
          }
        });
        
        // Asignar los datos al dataset
        chart.data.datasets[datasetIndex].data = data;
      }
    });
    
    // Actualizar el gráfico sin animación
    chart.update('none');
    
    // Asegurarnos de que se muestre correctamente
    setTimeout(() => chart.update('none'), 100);
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