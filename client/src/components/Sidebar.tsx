import { Link, useLocation } from 'wouter';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card } from '@/components/ui/card';
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
    { path: '/sensors', label: 'Sensors', icon: 'sensors' },
    { path: '/analytics', label: 'Analytics', icon: 'analytics' },
    { path: '/alerts', label: 'Alerts', icon: 'notifications' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const sidebarClass = `w-64 bg-white shadow-lg fixed lg:relative z-10 h-full transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  }`;

  return (
    <aside id="sidebar" className={sidebarClass}>
      <div className="p-4 h-full flex flex-col">
        <div className="mb-8 mt-2">
          <div className="px-4 py-3 bg-primary bg-opacity-10 rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <span className="material-icons text-primary mr-2">cloud</span>
              <h3 className="font-medium text-primary">MQTT Connection</h3>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Status:</span>
              <span className={`font-medium flex items-center ${mqttConnected ? 'text-accent' : 'text-neutral-500'}`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${mqttConnected ? 'bg-accent' : 'bg-neutral-500'}`}></span>
                {mqttConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span>Broker:</span>
              <span className="font-mono text-xs">{mqttBroker || 'Not connected'}</span>
            </div>
          </div>

          <nav>
            <ul>
              {navItems.map((item) => (
                <li key={item.path} className="mb-1">
                  <Link href={item.path}>
                    <a
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors group ${
                        location === item.path
                          ? 'bg-primary bg-opacity-10 text-primary'
                          : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <span className={`material-icons mr-3 ${
                        location === item.path 
                          ? '' 
                          : 'text-neutral-500 group-hover:text-primary'
                      }`}>{item.icon}</span>
                      <span>{item.label}</span>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-auto">
          <div className="px-4 py-3 bg-neutral-100 rounded-lg">
            <div className="flex items-center mb-2">
              <span className="material-icons text-neutral-500 mr-2">info</span>
              <h3 className="font-medium">System Info</h3>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Kitty Paw:</span>
                <span className="font-mono">{systemInfo?.version || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>MQTT Monitor:</span>
                <span className="font-mono">{systemInfo?.mqttVersion || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span className="font-mono">{systemInfo?.lastUpdate || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
