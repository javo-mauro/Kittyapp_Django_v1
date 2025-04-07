import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/contexts/WebSocketContext';

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
  
  // Update chart with new data when readings change
  useEffect(() => {
    if (!chartInstance.current) return;
    
    const chart = chartInstance.current;
    
    // Update each dataset with latest data
    readings.forEach(reading => {
      const datasetIndex = chart.data.datasets.findIndex(ds => ds.label === reading.deviceId);
      if (datasetIndex !== -1) {
        // Shift data and add new reading
        const newData = [...chart.data.datasets[datasetIndex].data.slice(1), reading.value];
        chart.data.datasets[datasetIndex].data = newData;
      }
    });
    
    chart.update();
  }, [latestReadings]);
  
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
