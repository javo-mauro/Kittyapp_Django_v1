import { Card } from '@/components/ui/card';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { formatDistanceToNow } from 'date-fns';

export default function SystemMetrics() {
  const { systemMetrics } = useWebSocket();

  if (!systemMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mr-4">
              <span className="material-icons text-neutral-300">sync</span>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Loading...</p>
              <p className="text-xl font-medium">-</p>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const lastUpdateDate = systemMetrics.lastUpdate ? new Date(systemMetrics.lastUpdate) : null;
  const lastUpdateText = lastUpdateDate 
    ? formatDistanceToNow(lastUpdateDate, { addSuffix: true })
    : 'Unknown';

  const metrics = [
    {
      name: 'Active Devices',
      value: systemMetrics.activeDevices,
      icon: 'devices',
      color: 'primary'
    },
    {
      name: 'Active Sensors',
      value: systemMetrics.activeSensors,
      icon: 'sensors',
      color: 'accent'
    },
    {
      name: 'Alerts',
      value: systemMetrics.alerts,
      icon: 'warning',
      color: 'warning'
    },
    {
      name: 'Last Update',
      value: lastUpdateText,
      icon: 'schedule',
      color: 'neutral'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="p-4 flex items-center">
          <div className={`w-12 h-12 rounded-full bg-${metric.color === 'neutral' ? 'neutral-100' : metric.color} ${metric.color !== 'neutral' ? 'bg-opacity-10' : ''} flex items-center justify-center mr-4`}>
            <span className={`material-icons text-${metric.color === 'neutral' ? 'neutral-500' : metric.color}`}>{metric.icon}</span>
          </div>
          <div>
            <p className="text-sm text-neutral-500">{metric.name}</p>
            <p className={`${index === 3 ? 'text-sm' : 'text-xl'} font-medium`}>{metric.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
