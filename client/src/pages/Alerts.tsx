import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/contexts/WebSocketContext';

export default function Alerts() {
  const { devices } = useWebSocket();
  
  // Filter devices with warning status
  const warningDevices = devices.filter(device => device.status === 'warning');
  
  return (
    <div>
      <h2 className="text-2xl font-medium mb-6">Alerts Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-warning bg-opacity-10 flex items-center justify-center mr-4">
            <span className="material-icons text-warning">warning</span>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Active Alerts</p>
            <p className="text-3xl font-medium">{warningDevices.length}</p>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-error bg-opacity-10 flex items-center justify-center mr-4">
            <span className="material-icons text-error">error</span>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Critical Issues</p>
            <p className="text-3xl font-medium">0</p>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center">
          <div className="w-12 h-12 rounded-full bg-accent bg-opacity-10 flex items-center justify-center mr-4">
            <span className="material-icons text-accent">task_alt</span>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Resolved Today</p>
            <p className="text-3xl font-medium">2</p>
          </div>
        </Card>
      </div>
      
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h3 className="font-medium">Current Alerts</h3>
        </div>
        
        {warningDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="material-icons text-5xl text-neutral-300 mb-3">check_circle</span>
            <p className="text-neutral-500">No active alerts at the moment</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {warningDevices.map(device => (
              <div key={device.id} className="p-6 flex items-start">
                <div className="w-10 h-10 rounded-full bg-warning bg-opacity-10 flex items-center justify-center mr-4 mt-1">
                  <span className="material-icons text-warning">warning</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium">{device.deviceId} - Low Battery Warning</h4>
                    <Badge variant="outline" className="text-warning border-warning">Warning</Badge>
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">
                    Device battery level is critically low ({device.batteryLevel}%). Consider recharging or replacing the battery soon to prevent data loss.
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-neutral-500">
                      {new Date(device.lastUpdate || Date.now()).toLocaleString()}
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-xs text-primary hover:underline">Acknowledge</button>
                      <button className="text-xs text-primary hover:underline">Resolve</button>
                      <button className="text-xs text-primary hover:underline">Details</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
