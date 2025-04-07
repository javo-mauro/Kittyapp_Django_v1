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
        <h2 className="text-2xl font-medium">Sensor Monitoring</h2>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <div className="relative">
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="esp8266_01">ESP8266_01</SelectItem>
                <SelectItem value="esp8266_02">ESP8266_02</SelectItem>
                <SelectItem value="esp8266_03">ESP8266_03</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Last Hour" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="3h">Last 3 Hours</SelectItem>
                <SelectItem value="12h">Last 12 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <span className="material-icons">refresh</span>
          </Button>
        </div>
      </div>

      <SystemMetrics />
      
      <div className="mb-6">
        <SensorChart 
          title="Temperature Trend"
          sensorType="temperature"
          chartType="line"
          height="h-64"
          colorScheme={['#3f51b5', '#ff4081']}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SensorChart 
          title="Humidity Levels"
          sensorType="humidity"
          chartType="line"
          height="h-48"
          colorScheme={['#4caf50']}
        />

        <SensorChart 
          title="Light Intensity"
          sensorType="light"
          chartType="bar"
          height="h-48"
          colorScheme={['#ff9800']}
        />
      </div>

      <DeviceList />
    </div>
  );
}
