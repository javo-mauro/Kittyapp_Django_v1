import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// Removido: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: number;
  username: string;
  name: string | null;
  role: string | null;
  lastLogin: string | null;
}

// Eliminamos las interfaces que ya no usamos

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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [selectedItem, setSelectedItem] = useState<"user" | "device" | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Obtenemos la lista de usuarios del sistema
        const fetchedUsers = await apiRequest<User[]>("/api/users");
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);
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

  // Filtrar usuarios basados en el término de búsqueda
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
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  // Eliminamos la función de obtener mascotas por usuario, ya no la usamos

  // Función para obtener los dispositivos asociados a un usuario
  const fetchUserDevices = async (username: string) => {
    try {
      setDetailsLoading(true);
      // Usamos el parámetro de consulta para filtrar los dispositivos por usuario
      const fetchedDevices = await apiRequest<Device[]>(`/api/devices?username=${username}`);
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

  // Función para cambiar al usuario seleccionado usando el contexto de autenticación
  const { switchUser } = useAuth();
  const handleSwitchUser = async (username: string) => {
    try {
      const success = await switchUser(username);
      
      if (!success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cambiar al usuario seleccionado.",
        });
      }
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
    setSelectedItem("user");
    await fetchUserDevices(user.username);
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

  // Ya no necesitamos renderizar detalles adicionales de usuarios

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
        </div>

        {/* Panel derecho: Detalles del usuario seleccionado */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
              <CardDescription>
                {selectedUser 
                  ? "Información del usuario y dispositivos asociados" 
                  : "Selecciona un usuario para ver sus detalles"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedUser 
                ? renderUserDetails() 
                : (
                  <div className="h-72 flex flex-col items-center justify-center text-center p-8 text-gray-500">
                    <User className="h-16 w-16 mb-4 opacity-20" />
                    <p>Selecciona un usuario de la lista para ver sus detalles.</p>
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