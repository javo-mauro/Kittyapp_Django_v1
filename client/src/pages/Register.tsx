import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarIcon, 
  RefreshCw, 
  PlusCircle as PlusCircleIcon, 
  Users as UsersIcon,
  PawPrint 
} from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { CustomCalendar } from "@/components/CustomCalendar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { PetOwner, Pet } from "@shared/schema";

// Esquema para validar el formulario de registro de usuario
const petOwnerFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  paternalLastName: z.string().min(2, { message: "El apellido paterno debe tener al menos 2 caracteres" }),
  maternalLastName: z.string().optional(),
  city: z.string().min(2, { message: "La ciudad debe tener al menos 2 caracteres" }),
  district: z.string().min(2, { message: "La comuna debe tener al menos 2 caracteres" }),
  street: z.string().min(2, { message: "La calle debe tener al menos 2 caracteres" }),
  number: z.string().min(1, { message: "El número debe tener al menos 1 caracter" }),
  addressDetails: z.string().optional(),
  birthDate: z.date({ required_error: "Se requiere fecha de nacimiento" }),
  email: z.string().email({ message: "Correo electrónico inválido" }),
  username: z.string().min(6, { message: "El nombre de usuario debe tener al menos 6 caracteres" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
});

// Esquema para validar el formulario de mascota
const petFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  chipNumber: z.string().min(15, { message: "El número de microchip debe tener 15 dígitos" }).max(15),
  breed: z.string().min(2, { message: "La raza debe tener al menos 2 caracteres" }),
  species: z.string().min(2, { message: "La especie debe tener al menos 2 caracteres" }),
  acquisitionDate: z.date({ required_error: "Se requiere fecha de adquisición" }),
  birthDate: z.date().optional(),
  origin: z.string().min(2, { message: "El origen debe tener al menos 2 caracteres" }),
  background: z.string().optional(),
  hasVaccinations: z.boolean().default(false),
  hasDiseases: z.boolean().default(false),
  diseaseNotes: z.string().optional(),
  lastVetVisit: z.date().optional(),
  kittyPawDeviceId: z.string().optional(),
  ownerId: z.number({ required_error: "Debes seleccionar un usuario para esta mascota" })
});

export default function Register() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("owner");
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [currentTab, setCurrentTab] = useState('petOwner');
  
  // Estados para los diálogos
  const [showOwnersDialog, setShowOwnersDialog] = useState(false);
  const [showPetsDialog, setShowPetsDialog] = useState(false);
  const [showOwnerDetailsDialog, setShowOwnerDetailsDialog] = useState(false);
  const [showPetDetailsDialog, setShowPetDetailsDialog] = useState(false);
  
  // Estados para los elementos seleccionados
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  
  // Consultas para obtener usuarios y mascotas
  const { data: petOwners = [], isLoading: isLoadingOwners, refetch: refetchOwners } = useQuery<PetOwner[]>({
    queryKey: ['/api/pet-owners'],
    enabled: true
  });
  
  const { data: pets = [], isLoading: isLoadingPets, refetch: refetchPets } = useQuery<Pet[]>({
    queryKey: ['/api/pets'],
    enabled: true
  });

  // Configuración del formulario de registro de usuario
  const petOwnerForm = useForm<z.infer<typeof petOwnerFormSchema>>({
    resolver: zodResolver(petOwnerFormSchema),
    defaultValues: {
      name: "",
      paternalLastName: "",
      maternalLastName: "",
      city: "",
      district: "",
      street: "",
      number: "",
      username: "",
      password: "",
      addressDetails: "",
      email: "",
      birthDate: undefined
    }
  });

  // Configuración del formulario de mascota
  const petForm = useForm<z.infer<typeof petFormSchema>>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: "",
      chipNumber: "",
      breed: "",
      species: "",
      origin: "",
      background: "",
      hasVaccinations: false,
      hasDiseases: false,
      diseaseNotes: "",
      kittyPawDeviceId: "",
      ownerId: 0
    }
  });

  // Manejar envío del formulario de registro de usuario
  async function onSubmitPetOwner(data: z.infer<typeof petOwnerFormSchema>) {
    try {
      // Convertir las fechas a formato ISO string
      const formattedData = {
        ...data,
        birthDate: data.birthDate.toISOString()
      };

      console.log("Enviando datos del usuario:", formattedData);

      const result = await apiRequest<{ id: number }>("/api/pet-owners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      console.log("Respuesta del servidor:", result);

      // Extraer el ID del usuario de la respuesta
      let ownerIdValue: number | null = null;
      
      if (result && typeof result === 'object') {
        // Verificamos si el resultado tiene una propiedad id
        if ('id' in result && typeof result.id === 'number') {
          ownerIdValue = result.id;
          console.log("ID encontrado directamente:", ownerIdValue);
        } else {
          // Convertimos el resultado a any para buscar propiedades dinámicamente
          const resultObj: any = result;
          
          // Buscamos cualquier propiedad que pueda ser un ID
          for (const key in resultObj) {
            if (key.toLowerCase().includes('id') && typeof resultObj[key] === 'number') {
              ownerIdValue = resultObj[key];
              console.log(`Encontrado posible ID en campo ${key}:`, ownerIdValue);
              break;
            }
          }
        }
      }
      
      if (ownerIdValue) {
        console.log("ID del usuario establecido:", ownerIdValue);
        setOwnerId(ownerIdValue);
        // También actualizar el valor por defecto en el formulario de mascota
        petForm.setValue("ownerId", ownerIdValue);
        
        toast({
          title: "Registro exitoso",
          description: "El usuario se ha registrado correctamente. Ahora puede registrar a su mascota.",
        });
        // Cambiar a la pestaña de mascota
        setActiveTab("pet");
      } else {
        console.error("No se pudo extraer un ID de la respuesta:", result);
        throw new Error("No se recibió un ID válido del servidor");
      }
    } catch (error) {
      let message = "Ocurrió un error al registrar el usuario";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    }
  }

  // Manejar envío del formulario de mascota
  async function onSubmitPet(data: z.infer<typeof petFormSchema>) {
    try {
      const selectedOwnerId = data.ownerId;
      if (!selectedOwnerId) {
        toast({
          title: "Error",
          description: "Debes seleccionar un usuario para la mascota",
          variant: "destructive"
        });
        return;
      }

      console.log("Datos de mascota a enviar:", { ...data });

      // Convertir las fechas a formato ISO string
      const formattedData = {
        ...data,
        acquisitionDate: data.acquisitionDate.toISOString(),
        birthDate: data.birthDate ? data.birthDate.toISOString() : undefined,
        lastVetVisit: data.lastVetVisit ? data.lastVetVisit.toISOString() : undefined
      };

      console.log("Enviando datos de mascota:", formattedData);

      const response = await apiRequest("/api/pets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      console.log("Respuesta del servidor:", response);

      toast({
        title: "Registro exitoso",
        description: "La mascota se ha registrado correctamente.",
      });
      
      // Resetear solo ciertos campos del formulario manteniendo el ownerId
      const currentOwnerId = data.ownerId;
      petForm.reset({
        name: "",
        chipNumber: "",
        breed: "",
        species: "",
        origin: "",
        background: "",
        hasVaccinations: false,
        hasDiseases: false,
        diseaseNotes: "",
        kittyPawDeviceId: "",
        ownerId: currentOwnerId // Mantener el mismo usuario para poder registrar múltiples mascotas
      });
    } catch (error) {
      let message = "Ocurrió un error al registrar la mascota";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    }
  }

  return (
    <div className="container py-8 mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-center bg-gradient-to-r from-[#FF847C] to-[#EBB7AA] bg-clip-text text-transparent">
        Registro de KittyPaw
      </h1>

      <div className="flex justify-center">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full max-w-3xl"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="owner" className="text-lg py-4 bg-[#FF9F8F] data-[state=active]:bg-[#FF947C] text-white">Usuario</TabsTrigger>
            <TabsTrigger value="pet" className="text-lg py-4 bg-[#FBAFA4] data-[state=active]:bg-[#FF947C] text-white">Mascota</TabsTrigger>
          </TabsList>

          <TabsContent value="owner">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#F87A6D]">Registro de Usuario</CardTitle>
                <CardDescription>
                  Por favor ingresa tus datos o inicia sesión con Google.
                </CardDescription>
                <div className="mt-3 flex justify-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => toast({
                      title: "Autenticación con Google",
                      description: "Esta funcionalidad será implementada próximamente.",
                    })}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                    <span>Ingresar con Google</span>
                  </Button>
                </div>
                <div className="relative mt-3 mb-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300"></span>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-500">O regístrate manualmente</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...petOwnerForm}>
                  <form onSubmit={petOwnerForm.handleSubmit(onSubmitPetOwner)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={petOwnerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombres</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="paternalLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellido Paterno</FormLabel>
                            <FormControl>
                              <Input placeholder="Apellido paterno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="maternalLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellido Materno</FormLabel>
                            <FormControl>
                              <Input placeholder="Apellido materno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo Electrónico</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input placeholder="Ciudad" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="district"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comuna</FormLabel>
                            <FormControl>
                              <Input placeholder="Comuna" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Calle</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre de la calle" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input placeholder="Número" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="addressDetails"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Detalles adicionales</FormLabel>
                            <FormControl>
                              <Input placeholder="Apartamento, piso, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="birthDate"
                        render={({ field }) => (
                          <CustomCalendar 
                            field={field} 
                            label="Fecha de Nacimiento" 
                          />
                        )}
                      />

                      <FormField
                        control={petOwnerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de Usuario</FormLabel>
                            <FormControl>
                              <Input placeholder="Mínimo 6 caracteres" {...field} />
                            </FormControl>
                            <FormDescription>
                              Será usado para iniciar sesión
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={petOwnerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                            </FormControl>
                            <FormDescription>
                              Utiliza al menos 6 caracteres
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#FF897C] hover:bg-[#FF7A6C] text-white py-4 rounded-lg">
                      Registrar Usuario
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pet">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#F87A6D]">Registro de Mascota</CardTitle>
                <CardDescription>
                  Por favor ingresa los datos de tu mascota.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...petForm}>
                  <form onSubmit={petForm.handleSubmit(onSubmitPet)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={petForm.control}
                        name="ownerId"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel>Usuario</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              defaultValue={field.value?.toString() || undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un usuario para esta mascota" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {petOwners.map((owner) => (
                                  <SelectItem key={owner.id} value={owner.id.toString()}>
                                    {owner.name} {owner.paternalLastName} ({owner.username})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Selecciona al usuario dueño de la mascota
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={petForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre de la mascota" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="chipNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Microchip</FormLabel>
                            <FormControl>
                              <Input placeholder="982 000362934354" {...field} />
                            </FormControl>
                            <div className="relative">
                              <FormDescription className="flex items-center gap-1">
                                <span>El número de microchip debe ser de 15 dígitos según norma ISO 11784</span>
                                <div className="relative inline-block group">
                                  <span className="material-icons cursor-help text-sm text-neutral-400">info</span>
                                  <div className="hidden group-hover:block absolute z-50 w-80 p-4 bg-white border rounded-lg shadow-lg left-0 mt-2">
                                    <p className="text-sm text-gray-700">
                                      Un número de microchip conforme a la norma ISO 11784 en Chile consta de 15 dígitos y sigue una estructura específica. Por ejemplo: 982 000362934354
                                    </p>
                                  </div>
                                </div>
                              </FormDescription>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="species"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Especie</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una especie" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Felino">Felino</SelectItem>
                                <SelectItem value="Canino">Canino</SelectItem>
                                <SelectItem value="Ave">Ave</SelectItem>
                                <SelectItem value="Reptil">Reptil</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="breed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Raza</FormLabel>
                            <FormControl>
                              <Input placeholder="Raza de la mascota" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="origin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Origen</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar origen" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="compra">Compra</SelectItem>
                                <SelectItem value="adopcion">Adopción</SelectItem>
                                <SelectItem value="regalo">Regalo</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="background"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Procedencia</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar procedencia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="bueno">Bueno</SelectItem>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="malo">Malo</SelectItem>
                                <SelectItem value="calle">De la calle</SelectItem>
                                <SelectItem value="desconocido">Desconocido</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="kittyPawDeviceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dispositivo KittyPaw</FormLabel>
                            <FormControl>
                              <Input placeholder="KPCL0021" {...field} />
                            </FormControl>
                            <FormDescription>
                              ID del dispositivo KittyPaw asociado
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="acquisitionDate"
                        render={({ field }) => (
                          <CustomCalendar 
                            field={field} 
                            label="Fecha de Adquisición" 
                          />
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="birthDate"
                        render={({ field }) => (
                          <CustomCalendar 
                            field={field} 
                            label="Fecha de Nacimiento" 
                          />
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="lastVetVisit"
                        render={({ field }) => (
                          <CustomCalendar 
                            field={field} 
                            label="Última visita al veterinario" 
                          />
                        )}
                      />

                      <div className="col-span-1 space-y-4 md:col-span-2">
                        <FormField
                          control={petForm.control}
                          name="hasVaccinations"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Tiene vacunas</FormLabel>
                                <FormDescription>
                                  Marcar si la mascota tiene vacunas al día
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={petForm.control}
                          name="hasDiseases"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Tiene enfermedades</FormLabel>
                                <FormDescription>
                                  Marcar si la mascota tiene enfermedades conocidas
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      {petForm.watch("hasDiseases") && (
                        <FormField
                          control={petForm.control}
                          name="diseaseNotes"
                          render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2">
                              <FormLabel>Notas sobre enfermedades</FormLabel>
                              <FormControl>
                                <Input placeholder="Descripción de enfermedades" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Button type="submit" className="w-full bg-[#FF897C] hover:bg-[#FF7A6C] text-white py-4 rounded-lg">
                      Registrar Mascota
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("owner")} className="bg-[#FFDED9] hover:bg-[#FFD0C9] border-none text-[#FF7A6C] py-3 px-5 rounded-lg">
                  Volver a Usuario
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Sección de registro rápido y botones de navegación */}
      <div className="mt-10 grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-[#F87A6D]">
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Registros y visualización de información
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="flex-1 bg-[#F87A6D] hover:bg-[#E56A5D]"
                onClick={() => {
                  setCurrentTab('petOwner');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <PlusCircleIcon className="h-4 w-4 mr-2" />
                Añadir Nuevo Registro
              </Button>
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setShowOwnersDialog(true)}
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Ver Usuarios
              </Button>
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => setShowPetsDialog(true)}
              >
                <PawPrint className="h-4 w-4 mr-2" />
                Ver Mascotas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sección de listados de datos registrados */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-[#F87A6D]">
                Usuarios Registrados
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchOwners()}
                className="h-8 w-8 p-0 rounded-full"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Listado de usuarios en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOwners ? (
              <div className="flex justify-center py-4">
                <span className="animate-spin mr-2">⏳</span> Cargando...
              </div>
            ) : !Array.isArray(petOwners) || petOwners.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay usuarios registrados
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(petOwners) && petOwners.map((owner) => (
                  <div key={owner.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-medium">{owner.name} {owner.paternalLastName} {owner.maternalLastName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <div>📧 {owner.email}</div>
                      <div>📍 {owner.address}</div>
                      <div>🗓️ {new Date(owner.birthDate).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedOwnerId(owner.id);
                          setShowOwnerDetailsDialog(true);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-[#F87A6D]">
                Mascotas Registradas
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchPets()}
                className="h-8 w-8 p-0 rounded-full"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Listado de mascotas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPets ? (
              <div className="flex justify-center py-4">
                <span className="animate-spin mr-2">⏳</span> Cargando...
              </div>
            ) : !Array.isArray(pets) || pets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay mascotas registradas
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(pets) && pets.map((pet) => (
                  <div key={pet.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-medium">{pet.name} - {pet.species} {pet.breed}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <div>🔖 Microchip: {pet.chipNumber}</div>
                      <div>🌟 Origen: {pet.origin}</div>
                      {pet.kittyPawDeviceId && (
                        <div>📟 Dispositivo: {pet.kittyPawDeviceId}</div>
                      )}
                      <div>
                        {pet.hasVaccinations ? '✅ Vacunado' : '❌ Sin vacunas'} | 
                        {pet.hasDiseases ? '⚠️ Con enfermedades' : '✅ Saludable'}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPetId(pet.id);
                          setShowPetDetailsDialog(true);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogos para mostrar detalles */}
      <Dialog open={showOwnersDialog} onOpenChange={setShowOwnersDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#F87A6D]">Usuarios Registrados</DialogTitle>
            <DialogDescription>
              Listado completo de usuarios en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isLoadingOwners ? (
              <div className="flex justify-center py-4">
                <span className="animate-spin mr-2">⏳</span> Cargando...
              </div>
            ) : !Array.isArray(petOwners) || petOwners.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay usuarios registrados
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(petOwners) && petOwners.map((owner) => (
                  <div key={owner.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-medium">{owner.name} {owner.paternalLastName} {owner.maternalLastName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <div>📧 {owner.email}</div>
                      <div>📍 {owner.address}</div>
                      <div>🗓️ {new Date(owner.birthDate).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedOwnerId(owner.id);
                          setShowOwnerDetailsDialog(true);
                          setShowOwnersDialog(false);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowOwnersDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPetsDialog} onOpenChange={setShowPetsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#F87A6D]">Mascotas Registradas</DialogTitle>
            <DialogDescription>
              Listado completo de mascotas en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isLoadingPets ? (
              <div className="flex justify-center py-4">
                <span className="animate-spin mr-2">⏳</span> Cargando...
              </div>
            ) : !Array.isArray(pets) || pets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay mascotas registradas
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(pets) && pets.map((pet) => (
                  <div key={pet.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-medium">{pet.name} - {pet.species} {pet.breed}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <div>🔖 Microchip: {pet.chipNumber}</div>
                      <div>🌟 Origen: {pet.origin}</div>
                      {pet.kittyPawDeviceId && (
                        <div>📟 Dispositivo: {pet.kittyPawDeviceId}</div>
                      )}
                      <div>
                        {pet.hasVaccinations ? '✅ Vacunado' : '❌ Sin vacunas'} | 
                        {pet.hasDiseases ? '⚠️ Con enfermedades' : '✅ Saludable'}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPetId(pet.id);
                          setShowPetDetailsDialog(true);
                          setShowPetsDialog(false);
                        }}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPetsDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOwnerDetailsDialog} onOpenChange={setShowOwnerDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#F87A6D]">Detalle del Usuario</DialogTitle>
          </DialogHeader>
          {selectedOwnerId && (
            <>
              {petOwners.filter(owner => owner.id === selectedOwnerId).map(owner => (
                <div key={owner.id} className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm">Nombre completo</h3>
                      <p>{owner.name} {owner.paternalLastName} {owner.maternalLastName}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Correo electrónico</h3>
                      <p>{owner.email}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Dirección</h3>
                      <p>{owner.address}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Fecha de nacimiento</h3>
                      <p>{new Date(owner.birthDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="font-semibold text-sm mb-2">Mascotas del usuario</h3>
                    <div className="space-y-2">
                      {pets.filter(pet => pet.ownerId === owner.id).length > 0 ? (
                        pets.filter(pet => pet.ownerId === owner.id).map(pet => (
                          <div key={pet.id} className="border rounded-lg p-3 bg-gray-50">
                            <div className="font-medium">{pet.name} - {pet.species} {pet.breed}</div>
                            {pet.kittyPawDeviceId && (
                              <div className="text-sm text-muted-foreground">📟 Dispositivo: {pet.kittyPawDeviceId}</div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Este usuario no tiene mascotas registradas</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowOwnerDetailsDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPetDetailsDialog} onOpenChange={setShowPetDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#F87A6D]">Detalle de la Mascota</DialogTitle>
          </DialogHeader>
          {selectedPetId && (
            <>
              {pets.filter(pet => pet.id === selectedPetId).map(pet => (
                <div key={pet.id} className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-sm">Nombre</h3>
                      <p>{pet.name}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Especie</h3>
                      <p>{pet.species}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Raza</h3>
                      <p>{pet.breed}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Número de microchip</h3>
                      <p>{pet.chipNumber}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Fecha de adquisición</h3>
                      <p>{new Date(pet.acquisitionDate).toLocaleDateString()}</p>
                    </div>
                    {pet.birthDate && (
                      <div>
                        <h3 className="font-semibold text-sm">Fecha de nacimiento</h3>
                        <p>{new Date(pet.birthDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-sm">Origen</h3>
                      <p>{pet.origin}</p>
                    </div>
                    {pet.background && (
                      <div>
                        <h3 className="font-semibold text-sm">Antecedentes</h3>
                        <p>{pet.background}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-sm">Estado de vacunación</h3>
                      <p>{pet.hasVaccinations ? '✅ Vacunado' : '❌ Sin vacunas'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Estado de salud</h3>
                      <p>{pet.hasDiseases ? '⚠️ Con enfermedades' : '✅ Saludable'}</p>
                    </div>
                    {pet.hasDiseases && pet.diseaseNotes && (
                      <div className="col-span-2">
                        <h3 className="font-semibold text-sm">Notas sobre enfermedades</h3>
                        <p>{pet.diseaseNotes}</p>
                      </div>
                    )}
                    {pet.lastVetVisit && (
                      <div>
                        <h3 className="font-semibold text-sm">Última visita al veterinario</h3>
                        <p>{new Date(pet.lastVetVisit).toLocaleDateString()}</p>
                      </div>
                    )}
                    {pet.kittyPawDeviceId && (
                      <div>
                        <h3 className="font-semibold text-sm">Dispositivo KittyPaw</h3>
                        <p>{pet.kittyPawDeviceId}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold text-sm mb-2">Usuario</h3>
                    <div className="space-y-2">
                      {petOwners.filter(owner => owner.id === pet.ownerId).map(owner => (
                        <div key={owner.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="font-medium">{owner.name} {owner.paternalLastName} {owner.maternalLastName}</div>
                          <div className="text-sm text-muted-foreground">📧 {owner.email}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPetDetailsDialog(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}