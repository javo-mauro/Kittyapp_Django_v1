import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: number;
  username: string;
  name: string | null;
  role: string | null;
  lastLogin: string | null;
}

interface PetOwner {
  id: number;
  name: string;
  paternalLastName: string;
  maternalLastName: string | null;
  email: string;
  address: string;
  birthDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Pet {
  id: number;
  name: string;
  chipNumber: string;
  breed: string;
  species: string;
  ownerId: number;
  kittyPawDeviceId: string | null;
  // Otros campos del pet
}

interface Device {
  id: number;
  deviceId: string;
  name: string;
  type: string;
  status: string | null;
  batteryLevel: number | null;
  lastUpdate: string | null;
}

interface SensorData {
  id: number;
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: string;
}

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [petOwners, setPetOwners] = useState<PetOwner[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredPetOwners, setFilteredPetOwners] = useState<PetOwner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<PetOwner | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [selectedItem, setSelectedItem] = useState<"user" | "pet" | "device" | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Cargar usuarios y propietarios de mascotas
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Obtenemos la lista de usuarios del sistema
        const fetchedUsers = await apiRequest<User[]>("/api/users");
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);

        // Obtenemos la lista de propietarios de mascotas
        const fetchedPetOwners = await apiRequest<PetOwner[]>("/api/pet-owners");
        setPetOwners(fetchedPetOwners);
        setFilteredPetOwners(fetchedPetOwners);
      } catch (error) {
        console.error("Error al obtener usuarios:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los usuarios.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Filtrar usuarios y propietarios basados en el término de búsqueda
  useEffect(() => {
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      // Filtrar usuarios del sistema
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(lowerSearchTerm) ||
          (user.name && user.name.toLowerCase().includes(lowerSearchTerm))
      );
      setFilteredUsers(filtered);

      // Filtrar propietarios de mascotas
      const filteredOwners = petOwners.filter(
        (owner) =>
          owner.name.toLowerCase().includes(lowerSearchTerm) ||
          owner.paternalLastName.toLowerCase().includes(lowerSearchTerm) ||
          (owner.maternalLastName && owner.maternalLastName.toLowerCase().includes(lowerSearchTerm)) ||
          owner.email.toLowerCase().includes(lowerSearchTerm)
      );
      setFilteredPetOwners(filteredOwners);
    } else {
      setFilteredUsers(users);
      setFilteredPetOwners(petOwners);
    }
  }, [searchTerm, users, petOwners]);

  // Función para obtener las mascotas de un propietario
  const fetchPetsByOwnerId = async (ownerId: number) => {
    try {
      setDetailsLoading(true);
      const fetchedPets = await apiRequest<Pet[]>(`/api/pet-owners/${ownerId}/pets`);
      setPets(fetchedPets);
      
      // Limpiar dispositivos y datos de sensores cuando se cambia de propietario
      setDevices([]);
      setSensorData([]);
      
      return fetchedPets;
    } catch (error) {
      console.error(`Error al obtener mascotas del propietario ${ownerId}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las mascotas del propietario.",
      });
      return [];
    } finally {
      setDetailsLoading(false);
    }
  };

  // Función para obtener los dispositivos asociados a un usuario
  const fetchUserDevices = async (username: string) => {
    try {
      setDetailsLoading(true);
      const fetchedDevices = await apiRequest<Device[]>("/api/devices");
      // Filtramos solo los dispositivos asociados con el usuario actual
      // Nota: Esto es un ejemplo, debe ajustarse según la implementación real
      setDevices(fetchedDevices);
      
      // Limpiamos los datos de sensores cuando se cambia de usuario
      setSensorData([]);
      
      return fetchedDevices;
    } catch (error) {
      console.error(`Error al obtener dispositivos del usuario ${username}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los dispositivos del usuario.",
      });
      return [];
    } finally {
      setDetailsLoading(false);
    }
  };

  // Función para obtener los datos de sensores de un dispositivo
  const fetchDeviceSensorData = async (deviceId: string) => {
    try {
      setDetailsLoading(true);
      const data = await apiRequest<SensorData[]>(`/api/sensor-data/${deviceId}`);
      setSensorData(data);
      return data;
    } catch (error) {
      console.error(`Error al obtener datos del dispositivo ${deviceId}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos del dispositivo.",
      });
      return [];
    } finally {
      setDetailsLoading(false);
    }
  };

  // Función para cambiar al usuario seleccionado
  const handleSwitchUser = async (username: string) => {
    try {
      // Enviar solicitud para cambiar de usuario
      await apiRequest("/api/auth/switch-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      toast({
        title: "Usuario cambiado",
        description: `Has cambiado al usuario ${username}. Redirigiendo...`,
      });

      // Redirigir a la página principal después de un breve retraso
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("Error al cambiar de usuario:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cambiar al usuario seleccionado.",
      });
    }
  };

  // Manejar selección de usuario
  const handleUserSelect = async (user: User) => {
    setSelectedUser(user);
    setSelectedOwner(null); // Limpiar selección de propietario
    setPets([]); // Limpiar mascotas
    setSelectedItem("user");
    await fetchUserDevices(user.username);
  };

  // Manejar selección de propietario
  const handleOwnerSelect = async (owner: PetOwner) => {
    setSelectedOwner(owner);
    setSelectedUser(null); // Limpiar selección de usuario
    setSelectedItem("pet");
    await fetchPetsByOwnerId(owner.id);
  };

  // Manejar selección de dispositivo
  const handleDeviceSelect = async (device: Device) => {
    setSelectedItem("device");
    await fetchDeviceSensorData(device.deviceId);
  };

  // Renderizar detalles del usuario
  const renderUserDetails = () => {
    if (!selectedUser) return null;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{selectedUser.name || selectedUser.username}</h3>
            <p className="text-sm text-gray-500">Rol: {selectedUser.role || "No especificado"}</p>
            <p className="text-sm text-gray-500">
              Último acceso: {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : "Nunca"}
            </p>
          </div>
          <Button onClick={() => handleSwitchUser(selectedUser.username)}>
            Cambiar a este usuario
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-lg font-semibold">Dispositivos asociados</h4>
          {detailsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : devices.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Batería</TableHead>
                    <TableHead>Última actualización</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow 
                      key={device.id}
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => handleDeviceSelect(device)}
                    >
                      <TableCell>{device.deviceId}</TableCell>
                      <TableCell>{device.name}</TableCell>
                      <TableCell>{device.type}</TableCell>
                      <TableCell>
                        <Badge variant={device.status === "online" ? "success" : "secondary"}>
                          {device.status || "desconocido"}
                        </Badge>
                      </TableCell>
                      <TableCell>{device.batteryLevel !== null ? `${device.batteryLevel}%` : "-"}</TableCell>
                      <TableCell>
                        {device.lastUpdate ? new Date(device.lastUpdate).toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No hay dispositivos asociados a este usuario.</p>
          )}
        </div>

        {selectedItem === "device" && sensorData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-lg font-semibold">Datos del sensor</h4>
            <div className="border rounded-md p-4 bg-gray-50">
              <ScrollArea className="h-60">
                <pre className="text-xs">{JSON.stringify(sensorData, null, 2)}</pre>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar detalles del propietario
  const renderOwnerDetails = () => {
    if (!selectedOwner) return null;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">
            {selectedOwner.name} {selectedOwner.paternalLastName} {selectedOwner.maternalLastName || ""}
          </h3>
          <p className="text-sm text-gray-500">Email: {selectedOwner.email}</p>
          <p className="text-sm text-gray-500">
            Fecha de nacimiento: {new Date(selectedOwner.birthDate).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-lg font-semibold">Mascotas</h4>
          {detailsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : pets.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Chip</TableHead>
                    <TableHead>Dispositivo KittyPaw</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pets.map((pet) => (
                    <TableRow 
                      key={pet.id}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <TableCell>{pet.name}</TableCell>
                      <TableCell>{pet.species}</TableCell>
                      <TableCell>{pet.breed}</TableCell>
                      <TableCell>{pet.chipNumber}</TableCell>
                      <TableCell>
                        {pet.kittyPawDeviceId ? (
                          <Badge variant="outline" className="bg-blue-50">
                            {pet.kittyPawDeviceId}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Este propietario no tiene mascotas registradas.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Gestión de Usuarios</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel izquierdo: Lista de usuarios */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs defaultValue="system">
            <TabsList className="w-full">
              <TabsTrigger value="system" className="flex-1">Usuarios del Sistema</TabsTrigger>
              <TabsTrigger value="owners" className="flex-1">Propietarios</TabsTrigger>
            </TabsList>
            
            <TabsContent value="system">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">Usuarios</CardTitle>
                  <CardDescription>Usuarios registrados en el sistema</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1 p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <div
                              key={user.id}
                              className={`p-3 rounded-md flex items-center space-x-3 cursor-pointer hover:bg-gray-100 ${
                                selectedUser?.id === user.id ? "bg-gray-100" : ""
                              }`}
                              onClick={() => handleUserSelect(user)}
                              onDoubleClick={() => handleSwitchUser(user.username)}
                            >
                              <div className="bg-primary/10 h-10 w-10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name || user.username}</p>
                                <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {user.role || "user"}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-4">No se encontraron usuarios.</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="owners">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">Propietarios</CardTitle>
                  <CardDescription>Propietarios de mascotas registrados</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1 p-2">
                        {filteredPetOwners.length > 0 ? (
                          filteredPetOwners.map((owner) => (
                            <div
                              key={owner.id}
                              className={`p-3 rounded-md flex items-center space-x-3 cursor-pointer hover:bg-gray-100 ${
                                selectedOwner?.id === owner.id ? "bg-gray-100" : ""
                              }`}
                              onClick={() => handleOwnerSelect(owner)}
                            >
                              <div className="bg-orange-100 h-10 w-10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-orange-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {owner.name} {owner.paternalLastName} {owner.maternalLastName || ""}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{owner.email}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-4">No se encontraron propietarios.</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Panel derecho: Detalles del usuario/propietario seleccionado */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
              <CardDescription>
                {selectedUser 
                  ? "Información del usuario y dispositivos asociados" 
                  : selectedOwner 
                    ? "Información del propietario y mascotas" 
                    : "Selecciona un usuario o propietario para ver sus detalles"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedUser 
                ? renderUserDetails() 
                : selectedOwner 
                  ? renderOwnerDetails() 
                  : (
                    <div className="h-72 flex flex-col items-center justify-center text-center p-8 text-gray-500">
                      <User className="h-16 w-16 mb-4 opacity-20" />
                      <p>Selecciona un usuario o propietario de la lista para ver sus detalles.</p>
                      <p className="text-sm mt-2">Puedes hacer doble clic en un usuario para cambiar a su cuenta.</p>
                    </div>
                  )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}