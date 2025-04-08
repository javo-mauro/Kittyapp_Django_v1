import { Link, useLocation } from 'wouter';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { mqttConnected, mqttBroker, systemInfo } = useWebSocket();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const menuToggle = document.getElementById('menuToggle');
      
      if (
        sidebar && 
        !sidebar.contains(event.target as Node) && 
        menuToggle && 
        !menuToggle.contains(event.target as Node) &&
        window.innerWidth < 1024 &&
        isOpen
      ) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/devices', label: 'Dispositivos', icon: 'memory' },
    { path: '/users', label: 'Usuarios', icon: 'people' },
    { path: '/settings', label: 'Configuración', icon: 'settings' },
    { path: '/register', label: 'Registro', icon: 'person_add' },
  ];

  const sidebarClass = `w-64 bg-white shadow-lg fixed lg:relative z-10 h-full transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  }`;

  return (
    <aside id="sidebar" className={sidebarClass}>
      <div className="p-4 h-full flex flex-col">
        <div className="mb-8 mt-2">
          <div className="px-4 py-3 card-device rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <span className="material-icons text-white mr-2">cloud</span>
              <h3 className="font-medium text-white">MQTT Conexión</h3>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#2A363B]">Estado:</span>
              <span className={`font-medium flex items-center text-[#2A363B]`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${mqttConnected ? 'bg-[#99B898]' : 'bg-[#E84A5F]'}`}></span>
                {mqttConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-[#2A363B]">Broker:</span>
              <span className="font-mono text-xs text-[#2A363B]">{mqttBroker || 'No conectado'}</span>
            </div>
          </div>

          <nav>
            <ul>
              {navItems.map((item) => (
                <li key={item.path} className="mb-1">
                  <Link to={item.path}>
                    <div
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors group ${
                        location === item.path
                          ? 'bg-[#FF847C] bg-opacity-10 text-[#FF847C]'
                          : 'hover:bg-[#EBB7AA] hover:bg-opacity-10 text-[#2A363B] hover:text-[#FF847C]'
                      }`}
                    >
                      <span className={`material-icons mr-3 ${
                        location === item.path 
                          ? 'text-[#FF847C]' 
                          : 'text-[#2A363B] group-hover:text-[#FF847C]'
                      }`}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-auto">
          <div className="px-4 py-3 card-info rounded-lg">
            <div className="flex items-center mb-2">
              <span className="material-icons text-white mr-2">info</span>
              <h3 className="font-medium text-white">Información</h3>
            </div>
            <div className="text-xs space-y-1 text-[#2A363B]">
              <div className="flex justify-between">
                <span>Kitty Paw:</span>
                <span className="font-mono">{systemInfo?.version || 'Desconocido'}</span>
              </div>
              <div className="flex justify-between">
                <span>MQTT Monitor:</span>
                <span className="font-mono">{systemInfo?.mqttVersion || 'Desconocido'}</span>
              </div>
              <div className="flex justify-between">
                <span>Última Act.:</span>
                <span className="font-mono">{systemInfo?.lastUpdate || 'Desconocido'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
