import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export default function Settings() {
  const { mqttConnected, mqttBroker, sendMessage } = useWebSocket();
  const [brokerUrl, setBrokerUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const { data: mqttStatus } = useQuery({
    queryKey: ['/api/mqtt/status'],
  });
  
  const handleConnectMqtt = () => {
    if (!brokerUrl || !clientId) {
      toast({
        title: "Validation Error",
        description: "Broker URL and Client ID are required",
        variant: "destructive",
      });
      return;
    }
    
    sendMessage({
      type: 'connect_mqtt',
      broker: brokerUrl,
      clientId,
      username: username || undefined,
      password: password || undefined
    });
    
    toast({
      title: "Connecting to MQTT Broker",
      description: "Attempting to establish connection...",
    });
  };
  
  return (
    <div>
      <h2 className="text-2xl font-medium mb-6">Settings</h2>
      
      <Tabs defaultValue="mqtt" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="mqtt">MQTT Connection</TabsTrigger>
          <TabsTrigger value="devices">Device Management</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mqtt">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">MQTT Broker Configuration</h3>
            
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Current Connection</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-neutral-500">Status:</div>
                <div className="font-medium flex items-center">
                  {mqttConnected ? (
                    <>
                      <span className="w-2 h-2 bg-accent rounded-full mr-2"></span>
                      Connected
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-neutral-400 rounded-full mr-2"></span>
                      Disconnected
                    </>
                  )}
                </div>
                
                <div className="text-neutral-500">Broker:</div>
                <div>{mqttBroker || 'Not connected'}</div>
                
                <div className="text-neutral-500">Client ID:</div>
                <div>{mqttStatus?.clientId || 'Unknown'}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="broker">MQTT Broker URL</Label>
                <Input
                  id="broker"
                  placeholder="mqtt://example.com:1883"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  placeholder="kitty-paw-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="username">Username (optional)</Label>
                <Input
                  id="username"
                  placeholder="mqtt-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <Button onClick={handleConnectMqtt}>
                Connect to Broker
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="devices">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Device Management</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-discovery</h4>
                  <p className="text-sm text-neutral-500">Automatically discover and add new devices</p>
                </div>
                <Switch id="auto-discovery" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Status notifications</h4>
                  <p className="text-sm text-neutral-500">Get notified when device status changes</p>
                </div>
                <Switch id="status-notifications" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Low battery alerts</h4>
                  <p className="text-sm text-neutral-500">Notify when battery level falls below 20%</p>
                </div>
                <Switch id="battery-alerts" defaultChecked />
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="system">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">System Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Dark Mode</h4>
                  <p className="text-sm text-neutral-500">Switch between light and dark theme</p>
                </div>
                <Switch id="dark-mode" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Data refresh interval</h4>
                  <p className="text-sm text-neutral-500">How often to refresh data in the dashboard</p>
                </div>
                <select className="bg-white border border-neutral-200 rounded-lg py-1 px-3 text-sm">
                  <option value="5">5 seconds</option>
                  <option value="10" selected>10 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Data retention</h4>
                  <p className="text-sm text-neutral-500">How long to keep historical data</p>
                </div>
                <select className="bg-white border border-neutral-200 rounded-lg py-1 px-3 text-sm">
                  <option value="7">7 days</option>
                  <option value="30" selected>30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
