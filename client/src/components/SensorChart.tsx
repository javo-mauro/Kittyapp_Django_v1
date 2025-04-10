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
    
    // Generate labels (time labels) - escala de 1 hora, con puntos cada 1 minuto (60 puntos)
    const now = new Date();
    const labels = Array.from({ length: 60 }, (_, i) => {
      const d = new Date(now);
      d.setMinutes(d.getMinutes() - 60 + i); // 1 hora = 60 minutos
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
        data: Array(60).fill(null), // 60 puntos para 1 hora (1 por minuto)
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
        // Limitar el tamaño del historial a 60 elementos (para 1 hora)
        if (updatedHistory[reading.deviceId].length >= 60) {
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
    
    // Crear un mapa para timestamps únicos por minuto
    const uniqueMinuteTimestamps = new Map<string, Date>();
    
    // Extraer timestamps de los datos y mantener el más reciente por minuto
    Object.values(readingsHistory).forEach(deviceReadings => {
      deviceReadings.forEach((reading: any) => {
        if (reading.timestamp) {
          try {
            // Convertir el timestamp string a objeto Date
            const date = new Date(reading.timestamp);
            if (!isNaN(date.getTime())) {
              // Usar el formato HH:mm como clave para combinar lecturas del mismo minuto
              const minuteKey = format(date, 'HH:mm');
              // Guardar el timestamp más reciente si hay múltiples en el mismo minuto
              if (!uniqueMinuteTimestamps.has(minuteKey) || 
                  date > uniqueMinuteTimestamps.get(minuteKey)!) {
                uniqueMinuteTimestamps.set(minuteKey, date);
              }
            }
          } catch (error) {
            console.error("Error processing timestamp:", reading.timestamp, error);
          }
        }
      });
    });
    
    // Convertir el mapa a un array de fechas
    let allTimestamps = Array.from(uniqueMinuteTimestamps.values());
    
    // Ordenar timestamps cronológicamente
    allTimestamps.sort((a, b) => a.getTime() - b.getTime());
    
    // SIEMPRE generar un rango completo de tiempo para asegurar 60 puntos
    const now = new Date();
    allTimestamps = []; // Limpiar array para evitar duplicados
    
    // Generar timestamps para la última hora (60 minutos)
    for (let i = 0; i < 60; i++) {
      const timestamp = new Date(now);
      timestamp.setMinutes(timestamp.getMinutes() - 60 + i);
      // Establecer segundos y milisegundos a 0 para tener minutos exactos
      timestamp.setSeconds(0);
      timestamp.setMilliseconds(0);
      allTimestamps.push(timestamp);
    }
    
    // Ya hemos generado un conjunto completo de 60 marcas de tiempo
    // No necesitamos agregar más timestamps o ajustar el rango
    
    // Eliminar duplicados después de ordenar (por si acaso)
    const uniqueTimestamps: Date[] = [];
    const seenMinutes = new Set<string>();
    
    allTimestamps.forEach(date => {
      const minuteKey = format(date, 'HH:mm');
      if (!seenMinutes.has(minuteKey)) {
        seenMinutes.add(minuteKey);
        uniqueTimestamps.push(date);
      }
    });
    
    // Limitar a 60 timestamps para mostrar máximo 1 hora
    const limitedTimestamps = uniqueTimestamps.slice(-60);
    
    // Convertir los timestamps a etiquetas legibles
    const timeLabels = limitedTimestamps.map(date => format(date, 'HH:mm'));
    
    // Log para depuración
    console.log('Timestamps para el gráfico:', 
      limitedTimestamps.map(date => 
        `${format(date, 'HH:mm:ss')} (${date.toISOString()})`
      ).join(', ')
    );
    
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
      // Ordenar los dispositivos para mantener el orden de las leyendas consistente
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
