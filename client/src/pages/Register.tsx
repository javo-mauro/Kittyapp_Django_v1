import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Esquema para validar el formulario de dueño de mascota
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
  email: z.string().email({ message: "Correo electrónico inválido" })
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
  ownerId: z.number()
});

export default function Register() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("owner");
  const [ownerId, setOwnerId] = useState<number | null>(null);

  // Configuración del formulario de dueño de mascota
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
      addressDetails: "",
      email: ""
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

  // Manejar envío del formulario de dueño de mascota
  async function onSubmitPetOwner(data: z.infer<typeof petOwnerFormSchema>) {
    try {
      // Convertir las fechas a formato ISO string
      const formattedData = {
        ...data,
        birthDate: data.birthDate.toISOString()
      };

      console.log("Enviando datos del dueño:", formattedData);

      const result = await apiRequest<{ id: number }>("/api/pet-owners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      console.log("Respuesta del servidor:", result);

      // Extraer el ID del dueño de la respuesta
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
        console.log("ID del dueño establecido:", ownerIdValue);
        setOwnerId(ownerIdValue);
        // También actualizar el valor por defecto en el formulario de mascota
        petForm.setValue("ownerId", ownerIdValue);
        
        toast({
          title: "Registro exitoso",
          description: "El dueño se ha registrado correctamente. Ahora puede registrar a su mascota.",
        });
        // Cambiar a la pestaña de mascota
        setActiveTab("pet");
      } else {
        console.error("No se pudo extraer un ID de la respuesta:", result);
        throw new Error("No se recibió un ID válido del servidor");
      }
    } catch (error) {
      let message = "Ocurrió un error al registrar el dueño";
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
      if (!ownerId) {
        throw new Error("No se ha seleccionado un dueño. Por favor registre primero al dueño.");
      }

      console.log("Datos de mascota a enviar:", { ...data, ownerId });

      // Convertir las fechas a formato ISO string y asegurarnos de que ownerId está establecido
      const formattedData = {
        ...data,
        ownerId: ownerId, // Usar explícitamente el ownerId del estado
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
      const currentOwnerId = ownerId;
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
        ownerId: currentOwnerId // Mantener el mismo dueño para poder registrar múltiples mascotas
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
            <TabsTrigger value="owner" className="text-lg py-4 bg-[#FF9F8F] data-[state=active]:bg-[#FF947C] text-white">Dueño</TabsTrigger>
            <TabsTrigger value="pet" disabled={!ownerId} className="text-lg py-4 bg-[#FBAFA4] data-[state=active]:bg-[#FF947C] text-white">Mascota</TabsTrigger>
          </TabsList>

          <TabsContent value="owner">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#F87A6D]">Registro de Dueño</CardTitle>
                <CardDescription>
                  Por favor ingresa los datos del dueño de la mascota o inicia sesión con Google.
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
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Nacimiento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#FF897C] hover:bg-[#FF7A6C] text-white py-4 rounded-lg">
                      Registrar Dueño
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
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Adquisición</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Nacimiento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={petForm.control}
                        name="lastVetVisit"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Última visita al veterinario</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
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
                  Volver a Dueño
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}