import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { mqttConnected } = useWebSocket();
  
  const { data: user } = useQuery({
    queryKey: ['/api/user/current'],
  });

  return (
    <header className="bg-primary text-white shadow-md z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            onClick={onMenuToggle}
            className="mr-4 lg:hidden focus:outline-none"
          >
            <span className="material-icons">menu</span>
          </button>
          <div className="flex items-center">
            {/* Use a cat icon as the logo */}
            <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
              <span className="material-icons">pets</span>
            </div>
            <h1 className="text-xl font-medium">Kitty Paw</h1>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="hidden md:flex items-center mr-4 px-3 py-1 bg-white bg-opacity-20 rounded-full">
            <span className="material-icons text-sm mr-1">wifi</span>
            <span className="text-sm">{mqttConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center">
            <div className="mr-3 text-right">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs opacity-80">{user?.role || 'Guest'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <span className="material-icons">person</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
