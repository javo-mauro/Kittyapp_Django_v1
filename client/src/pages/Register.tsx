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
  address: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres" }),
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
      address: "",
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

      const result = await apiRequest<{ id: number }>("/api/pet-owners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      setOwnerId(result.id);
      toast({
        title: "Registro exitoso",
        description: "El dueño se ha registrado correctamente. Ahora puede registrar a su mascota.",
      });
      // Cambiar a la pestaña de mascota
      setActiveTab("pet");
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

      // Convertir las fechas a formato ISO string
      const formattedData = {
        ...data,
        ownerId,
        acquisitionDate: data.acquisitionDate.toISOString(),
        birthDate: data.birthDate ? data.birthDate.toISOString() : undefined,
        lastVetVisit: data.lastVetVisit ? data.lastVetVisit.toISOString() : undefined
      };

      await apiRequest("/api/pets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      toast({
        title: "Registro exitoso",
        description: "La mascota se ha registrado correctamente.",
      });
      // Resetear formulario
      petForm.reset();
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
            <TabsTrigger value="owner">Dueño</TabsTrigger>
            <TabsTrigger value="pet" disabled={!ownerId}>Mascota</TabsTrigger>
          </TabsList>

          <TabsContent value="owner">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Dueño</CardTitle>
                <CardDescription>
                  Por favor ingresa los datos del dueño de la mascota.
                </CardDescription>
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
                        name="address"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                              <Input placeholder="Dirección completa" {...field} />
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

                    <Button type="submit" className="w-full bg-gradient-to-r from-[#FF847C] to-[#EBB7AA] hover:from-[#EBB7AA] hover:to-[#FF847C]">
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
                <CardTitle>Registro de Mascota</CardTitle>
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
                            <FormDescription>
                              El número de microchip debe ser de 15 dígitos según norma ISO 11784
                            </FormDescription>
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

                    <Button type="submit" className="w-full bg-gradient-to-r from-[#FF847C] to-[#EBB7AA] hover:from-[#EBB7AA] hover:to-[#FF847C]">
                      Registrar Mascota
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("owner")}>
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