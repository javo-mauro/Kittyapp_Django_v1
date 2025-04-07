import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/contexts/WebSocketContext';
import SensorChart from '@/components/SensorChart';

export default function Sensors() {
  const { devices, latestReadings } = useWebSocket();
  
  // Get unique sensor types
  const sensorTypes = [...new Set(latestReadings.map(reading => reading.sensorType))];
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-medium mb-4">Sensors Dashboard</h2>
        <p className="text-neutral-600">
          Monitor and visualize all sensor data from your IoT devices. View real-time data and historical trends for each sensor type.
        </p>
      </div>

      <Tabs defaultValue="temperature" className="mb-6">
        <TabsList className="mb-4">
          {sensorTypes.map(type => (
            <TabsTrigger key={type} value={type} className="capitalize">
              {type}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {sensorTypes.map(type => (
          <TabsContent key={type} value={type}>
            <div className="grid grid-cols-1 gap-6 mb-6">
              <SensorChart 
                title={`${type.charAt(0).toUpperCase() + type.slice(1)} Readings`}
                sensorType={type}
                chartType="line"
                height="h-80"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices
                .filter(device => device.status !== 'offline')
                .map(device => {
                  const reading = latestReadings.find(
                    r => r.deviceId === device.deviceId && r.sensorType === type
                  );
                  
                  if (!reading) return null;
                  
                  return (
                    <Card key={`${device.id}-${type}`} className="p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-3">
                          <span className="material-icons text-primary">
                            {type === 'temperature' ? 'thermostat' : 
                             type === 'humidity' ? 'water_drop' : 
                             type === 'light' ? 'light_mode' : 
                             type === 'motion' ? 'directions_run' : 'sensors'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium">{device.deviceId}</h3>
                          <p className="text-xs text-neutral-500">{device.type}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-neutral-500 mb-1 capitalize">{type}</p>
                          <p className="text-3xl font-medium">
                            {reading.value?.toFixed(1)}<span className="text-lg ml-1">{reading.unit}</span>
                          </p>
                        </div>
                        <div className="text-xs text-right">
                          <p className="text-neutral-500">Updated</p>
                          <p>{new Date(reading.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })
                .filter(Boolean) // Remove null entries
              }
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
