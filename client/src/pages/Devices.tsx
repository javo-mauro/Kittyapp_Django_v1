import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWebSocket } from '@/contexts/WebSocketContext';
import SensorChart from '@/components/SensorChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from '@/lib/queryClient';

export default function Devices() {
  const { devices, latestReadings } = useWebSocket();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [petOwners, setPetOwners] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetOwner, setSelectedPetOwner] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  // Effect para cargar las mascotas cuando se selecciona un usuario
  useEffect(() => {
    if (selectedPetOwner) {
      fetch(`/api/pet-owners/${selectedPetOwner}/pets`)
        .then(res => res.json())
        .then(data => {
          setPets(data);
        })
        .catch(error => {
          console.error('Error fetching pets:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las mascotas del usuario',
            variant: 'destructive'
          });
        });
    } else {
      setPets([]);
    }
  }, [selectedPetOwner, toast]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    type: 'KittyPaw Collar',
    selectedPet: '',
  });

  // Manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (!formData.deviceId || !formData.name) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Crear el dispositivo
      const deviceResponse = await apiRequest('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: formData.deviceId,
          name: formData.name,
          type: formData.type,
          status: 'offline',
          batteryLevel: 100
        }),
      });

      // Si se seleccionó una mascota, actualizar la mascota con el ID del dispositivo
      if (formData.selectedPet) {
        await apiRequest(`/api/pets/${formData.selectedPet}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kittyPawDeviceId: formData.deviceId
          }),
        });
      }

      // Actualizar la lista de dispositivos
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });

      toast({
        title: 'Dispositivo creado',
        description: `Se ha creado el dispositivo ${formData.deviceId} exitosamente`,
      });

      // Cerrar el modal y limpiar el formulario
      setIsCreateModalOpen(false);
      setFormData({
        deviceId: '',
        name: '',
        type: 'KittyPaw Collar',
        selectedPet: '',
      });
      setSelectedPetOwner(null);
    } catch (error) {
      console.error('Error creating device:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el dispositivo',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h2 className="titulo">Información del Dispositivo</h2>
        
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <Button 
            variant="default" 
            onClick={() => {
              setIsCreateModalOpen(true);
              // Cargar los usuarios con mascotas
              fetch('/api/pet-owners')
                .then(res => res.json())
                .then(data => {
                  setPetOwners(data);
                })
                .catch(error => {
                  console.error('Error fetching pet owners:', error);
                  toast({
                    title: 'Error',
                    description: 'No se pudieron cargar los usuarios con mascotas',
                    variant: 'destructive'
                  });
                });
            }}
            className="mr-2"
          >
            <span className="material-icons text-sm mr-1">add</span>
            Nuevo Dispositivo
          </Button>
          
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

      {/* Modal de creación de dispositivo */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Dispositivo</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deviceId" className="text-right">
                ID Dispositivo*
              </Label>
              <Input
                id="deviceId"
                name="deviceId"
                placeholder="Ej: KPCL0022"
                value={formData.deviceId}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre*
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ej: KittyPaw de Fido"
                value={formData.name}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipo
              </Label>
              <Select 
                name="type" 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KittyPaw Collar">KittyPaw Collar</SelectItem>
                  <SelectItem value="KittyPaw Locator">KittyPaw Locator</SelectItem>
                  <SelectItem value="KittyPaw Medical">KittyPaw Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="petOwner" className="text-right">
                Propietario
              </Label>
              <Select 
                value={selectedPetOwner?.toString() || ''} 
                onValueChange={(value) => setSelectedPetOwner(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Ninguno</SelectItem>
                  {petOwners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.name} {owner.paternalLastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPetOwner && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pet" className="text-right">
                  Mascota
                </Label>
                <Select 
                  value={formData.selectedPet} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, selectedPet: value }))}
                  disabled={pets.length === 0}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={pets.length === 0 ? "No hay mascotas disponibles" : "Seleccionar mascota"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Ninguna</SelectItem>
                    {pets.map(pet => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name} ({pet.chipNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2">Creando...</span>
                  <span className="material-icons animate-spin text-sm">autorenew</span>
                </>
              ) : (
                'Crear Dispositivo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}