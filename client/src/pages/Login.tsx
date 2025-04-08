import { Link, useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { FaGoogle } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const loginFormSchema = z.object({
  username: z.string().min(2, {
    message: 'El nombre de usuario debe tener al menos 2 caracteres.',
  }),
  password: z.string().min(6, {
    message: 'La contraseña debe tener al menos 6 caracteres.',
  }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, loading } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(data: z.infer<typeof loginFormSchema>) {
    try {
      // Usamos el método login del contexto de autenticación
      const success = await login(data.username, data.password);
      
      if (success) {
        // Si el inicio de sesión fue exitoso, redirigimos al dashboard
        setLocation('/dashboard');
      }
      // No es necesario manejar errores aquí, el contexto de autenticación se encarga de mostrar los mensajes
    } catch (error) {
      // Este bloque no debería ejecutarse normalmente, ya que el contexto maneja los errores
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Ocurrió un error durante el inicio de sesión."
      });
    }
  }

  const handleGoogleLogin = () => {
    toast({
      title: "Google Login",
      description: "Funcionalidad de inicio con Google aún no implementada.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-orange-100 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[#F87A6D]">KittyPaw Sensors</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitoreo avanzado para el bienestar de tu mascota
          </p>
        </div>

        <Card className="border-2 border-orange-100 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input placeholder="Ingresa tu nombre de usuario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Ingresa tu contraseña" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-[#F87A6D] hover:bg-[#E56A5D]"
                  disabled={loading}
                >
                  {loading ? "Cargando..." : "Iniciar Sesión"}
                </Button>
              </form>
            </Form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O continuar con</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={handleGoogleLogin}
            >
              <FaGoogle className="mr-2 h-4 w-4" />
              Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm text-gray-500">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-[#F87A6D] hover:underline">
                Regístrate aquí
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}