import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Función para mostrar nombres más amigables para los dispositivos
const getDeviceDisplayName = (deviceId: string): string => {
  const deviceMap: Record<string, string> = {
    'KPCL0021': 'Collar Malto',
    'KPCL0022': 'Placa de Canela',
  };
  
  return deviceMap[deviceId] || deviceId;
};

export default function DeviceList() {
  const { devices, fetchUserDevices } = useWebSocket();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cargar sólo los dispositivos del usuario al montar el componente
  useEffect(() => {
    if (user) {
      if (user.id && user.role === 'owner') {
        fetchUserDevices(user.id);
      } else if (user.username) {
        fetchUserDevices(undefined, user.username);
      }
    }
  }, [user, fetchUserDevices]);
  
  const filteredDevices = devices.filter(device => 
    device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleAddDevice = () => {
    toast({
      title: "Feature not implemented",
      description: "Adding new devices is not available in this demo.",
    });
  };
  
  return (
    <Card className="overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center">
        <h3 className="font-medium">Connected Devices</h3>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search devices..." 
              className="pl-9 pr-3 py-2 w-56"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-2.5 material-icons text-neutral-400 text-sm">search</span>
          </div>
          <Button 
            className="bg-primary text-white" 
            onClick={handleAddDevice}
          >
            <span className="material-icons text-sm mr-1">add</span>
            Add Device
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-neutral-50">
              <th className="py-3 px-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Device ID</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Last Update</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Battery</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-neutral-500">
                  No devices found
                </td>
              </tr>
            ) : (
              filteredDevices.map((device) => (
                <tr key={device.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-3 ${device.status === 'offline' ? 'bg-neutral-200' : ''}`}>
                        <span className={`material-icons text-primary text-sm ${device.status === 'offline' ? 'text-neutral-500' : ''}`}>memory</span>
                      </div>
                      <div>
                        <div className="font-medium text-neutral-700">{getDeviceDisplayName(device.deviceId)}</div>
                        <div className="text-xs text-neutral-500">{device.deviceId}</div>
                        <div className="text-xs text-neutral-500 font-mono">{device.ipAddress}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm">{device.type}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span>
                      {device.lastUpdate 
                        ? formatDistanceToNow(new Date(device.lastUpdate), { addSuffix: true }) 
                        : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <BatteryIndicator level={device.batteryLevel || 0} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 hover:bg-neutral-100 rounded">
                        <span className="material-icons text-neutral-500 text-lg">settings</span>
                      </button>
                      <button className="p-1 hover:bg-neutral-100 rounded">
                        <span className="material-icons text-neutral-500 text-lg">visibility</span>
                      </button>
                      <button className="p-1 hover:bg-neutral-100 rounded">
                        <span className="material-icons text-neutral-500 text-lg">more_vert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | undefined | null }) {
  let bgColor = '';
  let textColor = '';
  let dotColor = '';
  let label = '';
  
  switch (status) {
    case 'online':
      bgColor = 'bg-accent bg-opacity-10';
      textColor = 'text-accent';
      dotColor = 'bg-accent';
      label = 'Online';
      break;
    case 'warning':
      bgColor = 'bg-warning bg-opacity-10';
      textColor = 'text-warning';
      dotColor = 'bg-warning';
      label = 'Warning';
      break;
    case 'offline':
    default:
      bgColor = 'bg-neutral-200';
      textColor = 'text-neutral-500';
      dotColor = 'bg-neutral-400';
      label = 'Offline';
      break;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1`}></span>
      {label}
    </span>
  );
}

function BatteryIndicator({ level }: { level: number }) {
  let barColor = '';
  
  if (level === 0) {
    barColor = 'bg-neutral-300';
  } else if (level < 30) {
    barColor = 'bg-warning';
  } else {
    barColor = 'bg-accent';
  }
  
  return (
    <>
      <div className="w-20 bg-neutral-100 rounded-full h-2.5">
        <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${level}%` }}></div>
      </div>
      <span className="text-xs text-neutral-500 mt-1">{level === 0 ? 'N/A' : `${level}%`}</span>
    </>
  );
}
