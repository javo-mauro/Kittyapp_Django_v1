import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  role?: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Cargar el usuario desde sessionStorage al iniciar
  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user:', e);
        sessionStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });

      if (response && response.success) {
        // Guardar información del usuario
        setUser(response.user);
        sessionStorage.setItem('currentUser', JSON.stringify(response.user));
        
        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido, ${response.user.name || response.user.username}!`,
        });
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      let errorMessage = "Ocurrió un error al intentar iniciar sesión";
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: errorMessage,
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      // Llamar al endpoint de logout
      await apiRequest('/api/auth/logout', { method: 'POST' });
      
      // Limpiar datos de sesión
      sessionStorage.removeItem('currentUser');
      setUser(null);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      
      // Redirigir al inicio
      setLocation('/');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al cerrar sesión",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};