import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWebSocket } from '@/contexts/WebSocketContext';
import SensorChart from '@/components/SensorChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from 'date-fns';

export default function Devices() {
  const { devices, latestReadings } = useWebSocket();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1h');

  // Set the first device as default when devices are loaded
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDevice) {
      setSelectedDevice(devices[0].deviceId);
    }
  }, [devices, selectedDevice]);

  // Filter readings for the selected device
  const deviceReadings = latestReadings.filter(reading => 
    reading.deviceId === selectedDevice
  );

  // Get device details
  const deviceDetails = devices.find(device => device.deviceId === selectedDevice);

  // Get pet info for selected device
  const [petInfo, setPetInfo] = useState<any>(null);
  const [petLoading, setPetLoading] = useState(false);

  useEffect(() => {
    if (selectedDevice) {
      setPetLoading(true);
      fetch(`/api/devices/${selectedDevice}/pet`)
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          setPetInfo(data);
          setPetLoading(false);
        })
        .catch(() => {
          setPetInfo(null);
          setPetLoading(false);
        });
    }
  }, [selectedDevice]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="titulo">Información del Dispositivo</h2>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <div className="relative">
            <Select value={selectedDevice || ''} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar dispositivo" />
              </SelectTrigger>
              <SelectContent>
                {devices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.deviceId} ({device.name})
                  </SelectItem>
                ))}
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
        </div>
      </div>

      {selectedDevice && deviceDetails ? (
        <>
          {/* Device Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detalles del Dispositivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-4">
                        <span className="material-icons text-primary">memory</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{deviceDetails.name}</h3>
                        <p className="text-sm text-neutral-500">{deviceDetails.deviceId}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">Tipo:</span>
                        <span className="text-sm font-medium">{deviceDetails.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">IP:</span>
                        <span className="text-sm font-mono">{deviceDetails.ipAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">Estado:</span>
                        <span className={`text-sm font-medium ${
                          deviceDetails.status === 'online' ? 'text-green-500' : 
                          deviceDetails.status === 'warning' ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {deviceDetails.status === 'online' ? 'En línea' : 
                           deviceDetails.status === 'warning' ? 'Advertencia' : 'Desconectado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">Batería:</span>
                        <div className="flex items-center">
                          <div className="w-16 h-2 bg-neutral-100 rounded-full mr-2">
                            <div className={`h-2 rounded-full ${
                              (deviceDetails.batteryLevel || 0) > 60 ? 'bg-green-500' : 
                              (deviceDetails.batteryLevel || 0) > 20 ? 'bg-amber-500' : 'bg-red-500'
                            }`} style={{ width: `${deviceDetails.batteryLevel || 0}%` }}></div>
                          </div>
                          <span className="text-sm font-medium">{deviceDetails.batteryLevel || 0}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-neutral-500">Última actualización:</span>
                        <span className="text-sm">
                          {deviceDetails.lastUpdate ? formatDistanceToNow(new Date(deviceDetails.lastUpdate), { addSuffix: true }) : 'Desconocido'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                    {petInfo ? (
                      <div>
                        <h3 className="text-md font-medium mb-3">Mascota Asociada</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Nombre:</span>
                            <span className="text-sm font-medium">{petInfo.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Especie:</span>
                            <span className="text-sm">{petInfo.species}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Raza:</span>
                            <span className="text-sm">{petInfo.breed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">N° Chip:</span>
                            <span className="text-sm font-mono">{petInfo.chipNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Tiene Vacunas:</span>
                            <span className="text-sm">{petInfo.hasVaccinations ? 'Sí' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Tiene Enfermedades:</span>
                            <span className="text-sm">{petInfo.hasDiseases ? 'Sí' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    ) : petLoading ? (
                      <p className="text-center py-6 text-neutral-400">Cargando información de mascota...</p>
                    ) : (
                      <div className="bg-neutral-50 p-4 rounded-lg">
                        <p className="text-center text-neutral-500">No hay mascota asociada a este dispositivo</p>
                        <Button variant="outline" className="w-full mt-3">
                          Asociar mascota
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Lecturas Actuales</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceReadings.length > 0 ? (
                  <div className="space-y-4">
                    {deviceReadings
                      .filter(reading => ['temperature', 'humidity', 'light', 'weight'].includes(reading.sensorType))
                      .sort((a, b) => {
                        // Order: temperature, humidity, light, weight
                        const order = { temperature: 1, humidity: 2, light: 3, weight: 4 };
                        return order[a.sensorType as keyof typeof order] - order[b.sensorType as keyof typeof order];
                      })
                      .map(reading => (
                        <div key={reading.sensorType} className="flex justify-between items-center border-b pb-3">
                          <div>
                            <h4 className="text-sm font-medium">
                              {reading.sensorType === 'temperature' ? 'Temperatura' :
                               reading.sensorType === 'humidity' ? 'Humedad' : 
                               reading.sensorType === 'light' ? 'Luz' : 
                               reading.sensorType === 'weight' ? 'Peso' : reading.sensorType}
                            </h4>
                            <p className="text-xs text-neutral-500">
                              {new Date(reading.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">{Number(reading.value).toFixed(1)}</span>
                            <span className="text-sm ml-1">{reading.unit}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-neutral-400">No hay lecturas disponibles</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different sensor charts */}
          <Tabs defaultValue="all" className="w-full mb-6">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="temperature">Temperatura</TabsTrigger>
              <TabsTrigger value="humidity">Humedad</TabsTrigger>
              <TabsTrigger value="light">Luz</TabsTrigger>
              <TabsTrigger value="weight">Peso</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <SensorChart 
                      title="Temperatura"
                      sensorType="temperature"
                      chartType="line"
                      height="h-64"
                      colorScheme={['#FF847C']}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <SensorChart 
                      title="Humedad"
                      sensorType="humidity"
                      chartType="line"
                      height="h-64"
                      colorScheme={['#99B898']}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <SensorChart 
                      title="Luz"
                      sensorType="light"
                      chartType="line"
                      height="h-64"
                      colorScheme={['#F8C05A']}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <SensorChart 
                      title="Peso"
                      sensorType="weight"
                      chartType="line"
                      height="h-64"
                      colorScheme={['#EBB7AA']}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="temperature">
              <Card>
                <CardContent className="p-4">
                  <SensorChart 
                    title="Temperatura"
                    sensorType="temperature"
                    chartType="line"
                    height="h-96"
                    colorScheme={['#FF847C']}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="humidity">
              <Card>
                <CardContent className="p-4">
                  <SensorChart 
                    title="Humedad"
                    sensorType="humidity"
                    chartType="line"
                    height="h-96"
                    colorScheme={['#99B898']}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="light">
              <Card>
                <CardContent className="p-4">
                  <SensorChart 
                    title="Luz"
                    sensorType="light"
                    chartType="line"
                    height="h-96"
                    colorScheme={['#F8C05A']}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="weight">
              <Card>
                <CardContent className="p-4">
                  <SensorChart 
                    title="Peso"
                    sensorType="weight"
                    chartType="line"
                    height="h-96"
                    colorScheme={['#EBB7AA']}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Alert>
          <span className="material-icons mr-2">info</span>
          <AlertTitle>No hay dispositivos seleccionados</AlertTitle>
          <AlertDescription>
            Por favor selecciona un dispositivo para ver información detallada.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}