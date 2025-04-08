import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import kittyLogo from '../assets/kitty-logo.jpg';

interface HeaderProps {
  onMenuToggle: () => void;
}

interface User {
  username: string;
  name: string;
  role: string;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { mqttConnected } = useWebSocket();
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <nav className="navbar fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={onMenuToggle}
            className="mr-4 lg:hidden focus:outline-none"
          >
            <span className="material-icons text-[#2A363B]">menu</span>
          </button>
          <div className="flex items-center">
            {/* Logo - Enlace al dashboard si está autenticado, de lo contrario a la página de inicio de sesión */}
            <Link href={isAuthenticated ? "/dashboard" : "/"}>
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full overflow-hidden mr-3">
                  <img src={kittyLogo} alt="Kitty Paw" className="h-full w-full object-cover" />
                </div>
                <h1 className="app-title text-2xl font-bold">Kitty Paw</h1>
              </div>
            </Link>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/dashboard" className="nav-item hover:text-[#FF847C]">
            Dashboard
          </Link>
          <Link href="/devices" className="nav-item hover:text-[#FF847C]">
            Dispositivos
          </Link>
          <Link href="/settings" className="nav-item hover:text-[#FF847C]">
            Configuración
          </Link>
        </div>
        
        <div className="flex items-center">
          <div className="flex items-center mr-4 px-3 py-1 rounded-full border border-[#EBB7AA]">
            <span className={`w-2 h-2 rounded-full mr-2 ${mqttConnected ? 'bg-[#99B898]' : 'bg-[#E84A5F]'}`}></span>
            <span className="text-sm text-[#2A363B]">{mqttConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
          
          {!isAuthenticated ? (
            <Link to="/register" className="hidden md:flex mr-4">
              <button className="px-4 py-1.5 text-sm font-medium bg-[#FF847C] text-white rounded-md hover:bg-[#E84A5F] transition-colors">
                Registro
              </button>
            </Link>
          ) : null}
          
          <div className="flex items-center group relative">
            <div className="mr-3 text-right hidden md:block">
              <p className="text-sm font-medium text-[#2A363B]">{user?.name || user?.username || 'Usuario'}</p>
              <p className="text-xs text-[#FF847C]">{user?.role || 'Invitado'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#EBB7AA] bg-opacity-20 flex items-center justify-center cursor-pointer">
              <span className="material-icons text-[#EBB7AA]">person</span>
            </div>
            
            {/* Menú desplegable */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
              {isAuthenticated ? (
                <>
                  <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <span className="material-icons text-sm mr-2 align-middle">settings</span>
                    Configuración
                  </Link>
                  <button 
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={logout}
                  >
                    <span className="material-icons text-sm mr-2 align-middle">logout</span>
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <span className="material-icons text-sm mr-2 align-middle">login</span>
                    Iniciar sesión
                  </Link>
                  <Link to="/register" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <span className="material-icons text-sm mr-2 align-middle">person_add</span>
                    Registro
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
