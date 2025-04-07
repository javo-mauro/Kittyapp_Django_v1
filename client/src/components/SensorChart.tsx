import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { format } from 'date-fns';

interface SensorChartProps {
  title: string;
  sensorType: string;
  chartType?: 'line' | 'bar';
  height?: string;
  colorScheme?: string[];
}

export default function SensorChart({ 
  title, 
  sensorType, 
  chartType = 'line', 
  height = 'h-64',
  colorScheme = ['#3f51b5', '#ff4081', '#4caf50', '#ff9800']
}: SensorChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { latestReadings } = useWebSocket();
  
  // Mantener un historial de lecturas por dispositivo
  const [readingsHistory, setReadingsHistory] = useState<Record<string, any[]>>({});
  
  // Filter readings by sensor type
  const readings = latestReadings.filter(reading => reading.sensorType === sensorType);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Group readings by device
    const deviceReadings: Record<string, any[]> = {};
    readings.forEach(reading => {
      if (!deviceReadings[reading.deviceId]) {
        deviceReadings[reading.deviceId] = [];
      }
      deviceReadings[reading.deviceId].push(reading);
    });
    
    // Generate labels (time labels)
    const now = new Date();
    const labels = Array.from({ length: 9 }, (_, i) => {
      const d = new Date(now);
      d.setHours(d.getHours() - 8 + i);
      return d.getHours() + ':00';
    });
    
    // Generate datasets
    const datasets = Object.entries(deviceReadings).map(([deviceId, data], index) => {
      return {
        label: deviceId,
        data: Array.from({ length: 9 }, (_, i) => {
          // Add some random data for visualization
          return Math.random() * 10 + (sensorType === 'temperature' ? 20 : 
                                      sensorType === 'humidity' ? 45 : 
                                      sensorType === 'light' ? 500 : 0);
        }),
        borderColor: colorScheme[index % colorScheme.length],
        backgroundColor: `${colorScheme[index % colorScheme.length]}1A`, // Add 10% opacity
        tension: 0.3,
        fill: chartType === 'line',
      };
    });
    
    // Create the chart
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
              text: sensorType === 'temperature' ? 'Temperature (°C)' : 
                   sensorType === 'humidity' ? 'Humidity (%)' : 
                   sensorType === 'light' ? 'Light Intensity (lux)' : 'Value',
            },
            suggestedMin: sensorType === 'temperature' ? 15 : 
                         sensorType === 'humidity' ? 30 : 
                         sensorType === 'light' ? 0 : 0,
            suggestedMax: sensorType === 'temperature' ? 30 : 
                         sensorType === 'humidity' ? 80 : 
                         sensorType === 'light' ? 1500 : 100,
          },
          x: {
            title: {
              display: true,
              text: 'Time',
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
  }, [readings, sensorType, chartType, colorScheme]);
  
  // Actualizar el historial de lecturas cuando cambien los datos
  useEffect(() => {
    if (readings.length === 0) return;
    
    // Agrupar por dispositivo y actualizar el historial
    const updatedHistory = { ...readingsHistory };
    
    readings.forEach(reading => {
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
  }, [latestReadings]);
  
  // Actualizar el gráfico con los datos del historial
  useEffect(() => {
    if (!chartInstance.current || Object.keys(readingsHistory).length === 0) return;
    
    const chart = chartInstance.current;
    
    // Actualizar etiquetas con las últimas 9 marcas de tiempo
    const timeLabels = [];
    const now = new Date();
    
    // Si tenemos suficientes datos en el historial, usamos esas marcas de tiempo
    const anyDevice = Object.keys(readingsHistory)[0];
    if (readingsHistory[anyDevice] && readingsHistory[anyDevice].length > 0) {
      const deviceHistory = readingsHistory[anyDevice];
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
    
    // Actualizar cada conjunto de datos con los datos del historial
    Object.entries(readingsHistory).forEach(([deviceId, deviceReadings]) => {
      // Buscar el índice del conjunto de datos para este dispositivo
      let datasetIndex = chart.data.datasets.findIndex(ds => ds.label === deviceId);
      
      // Si no existe el dataset para este dispositivo, lo creamos
      if (datasetIndex === -1 && deviceReadings.length > 0) {
        const colorIndex = chart.data.datasets.length % colorScheme.length;
        const newDataset = {
          label: deviceId,
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
  }, [readingsHistory, chartType, colorScheme]);
  
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center">
        <h3 className="font-medium">{title}</h3>
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
