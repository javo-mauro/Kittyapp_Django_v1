import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import SystemMetrics from '@/components/SystemMetrics';
import SensorChart from '@/components/SensorChart';
import DeviceList from '@/components/DeviceList';
import { toast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('1h');
  
  const handleRefresh = () => {
    toast({
      title: "Refreshing data",
      description: "Getting the latest sensor readings",
    });
  };
  
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="titulo">Monitoreo de Sensores</h2>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <div className="relative">
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Todos los Dispositivos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Dispositivos</SelectItem>
                <SelectItem value="esp8266_01">ESP8266_01</SelectItem>
                <SelectItem value="esp8266_02">ESP8266_02</SelectItem>
                <SelectItem value="esp8266_03">ESP8266_03</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Última Hora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Última Hora</SelectItem>
                <SelectItem value="3h">Últimas 3 Horas</SelectItem>
                <SelectItem value="12h">Últimas 12 Horas</SelectItem>
                <SelectItem value="24h">Últimas 24 Horas</SelectItem>
                <SelectItem value="7d">Última Semana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" size="icon" onClick={handleRefresh} className="btn-secondary">
            <span className="material-icons">refresh</span>
          </Button>
        </div>
      </div>

      <div className="content-prototipo p-6 mb-6">
        <SystemMetrics />
      </div>
      
      <div className="content-data p-4 mb-6">
        <SensorChart 
          title="Tendencia de Temperatura"
          sensorType="temperature"
          chartType="line"
          height="h-64"
          colorScheme={['#2A363B', '#FF847C']}
        />
      </div>

      <div className="columns flex-col md:flex-row gap-6 mb-6">
        <div className="column content-data p-4 mb-4 md:mb-0 md:mr-3">
          <SensorChart 
            title="Niveles de Humedad"
            sensorType="humidity"
            chartType="line"
            height="h-48"
            colorScheme={['#99B898']}
          />
        </div>

        <div className="column content-prototipo p-4 md:ml-3">
          <SensorChart 
            title="Intensidad de Luz"
            sensorType="light"
            chartType="bar"
            height="h-48"
            colorScheme={['#FF847C']}
          />
        </div>
      </div>

      <div className="content-contacto p-4">
        <DeviceList />
      </div>
    </div>
  );
}
