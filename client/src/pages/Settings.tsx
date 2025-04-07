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
import { apiRequest } from '@/lib/queryClient';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function Settings() {
  const { mqttConnected, mqttBroker, sendMessage } = useWebSocket();
  const [brokerUrl, setBrokerUrl] = useState('a2fvfjwoybq3qw-ats.iot.us-east-2.amazonaws.com');
  const [clientId, setClientId] = useState('kitty-paw-' + Math.random().toString(16).substring(2, 10));
  const [connectionType, setConnectionType] = useState('standard');
  
  // Estándar auth
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Certificados AWS IoT
  const [caCert, setCaCert] = useState('');
  const [clientCert, setClientCert] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  
  interface MqttStatus {
    id: number;
    userId: number;
    brokerUrl: string;
    clientId: string;
    username?: string;
    connected: boolean;
    lastConnected: string;
    hasCaCert?: boolean;
    hasClientCert?: boolean;
    hasPrivateKey?: boolean;
  }
  
  const { data: mqttStatus, refetch: refetchMqttStatus } = useQuery<MqttStatus>({
    queryKey: ['/api/mqtt/status'],
  });
  
  const handleConnectMqtt = async () => {
    if (!brokerUrl || !clientId) {
      toast({
        title: "Validation Error",
        description: "Broker URL and Client ID are required",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const protocol = connectionType === 'certificate' ? 'mqtts://' : 'mqtt://';
      const fullBrokerUrl = brokerUrl.startsWith('mqtt://') || brokerUrl.startsWith('mqtts://') 
        ? brokerUrl 
        : protocol + brokerUrl;
      
      // Definir tipo para payload
      interface MqttConnectPayload {
        brokerUrl: string;
        clientId: string;
        username?: string;
        password?: string;
        caCert?: string;
        clientCert?: string;
        privateKey?: string;
      }
      
      const payload: MqttConnectPayload = {
        brokerUrl: fullBrokerUrl,
        clientId,
      };
      
      if (connectionType === 'standard') {
        if (username) payload.username = username;
        if (password) payload.password = password;
      } else if (connectionType === 'certificate') {
        if (!caCert || !clientCert || !privateKey) {
          toast({
            title: "Validation Error",
            description: "All certificates are required for secure connection",
            variant: "destructive",
          });
          return;
        }
        
        payload.caCert = caCert;
        payload.clientCert = clientCert;
        payload.privateKey = privateKey;
      }
      
      const response = await apiRequest<MqttStatus>('/api/mqtt/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      refetchMqttStatus();
      
      toast({
        title: "MQTT Connection",
        description: "Successfully connected to MQTT broker",
      });
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to MQTT broker. Please check your settings.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div>
      <h2 className="titulo mb-6">Configuración</h2>
      
      <Tabs defaultValue="mqtt" className="mb-6">
        <TabsList className="mb-4 bg-[#EBB7AA]">
          <TabsTrigger value="mqtt" className="data-[state=active]:bg-[#FF847C] data-[state=active]:text-white">Conexión MQTT</TabsTrigger>
          <TabsTrigger value="devices" className="data-[state=active]:bg-[#FF847C] data-[state=active]:text-white">Gestión de Dispositivos</TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-[#FF847C] data-[state=active]:text-white">Sistema</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mqtt">
          <div className="content-data p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-[#2A363B]">Configuración del Broker MQTT</h3>
            
            <div className="mb-6 p-4 bg-white rounded-lg">
              <h4 className="text-sm font-medium mb-2">Conexión Actual</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-[#2A363B]">Estado:</div>
                <div className="font-medium flex items-center">
                  {mqttConnected ? (
                    <>
                      <span className="w-2 h-2 bg-[#99B898] rounded-full mr-2"></span>
                      Conectado
                      {mqttStatus?.hasCaCert && mqttStatus?.hasClientCert && mqttStatus?.hasPrivateKey && (
                        <span className="ml-2 bg-[#EBB7AA] text-[#2A363B] text-xs px-2 py-0.5 rounded">SSL/TLS</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-[#E84A5F] rounded-full mr-2"></span>
                      Disconnected
                    </>
                  )}
                </div>
                
                <div className="text-neutral-500">Broker:</div>
                <div>{mqttBroker || 'Not connected'}</div>
                
                <div className="text-neutral-500">Client ID:</div>
                <div>{mqttStatus?.clientId || 'Unknown'}</div>
                
                {mqttStatus?.hasCaCert || mqttStatus?.hasClientCert || mqttStatus?.hasPrivateKey ? (
                  <>
                    <div className="text-neutral-500">Certificados:</div>
                    <div className="flex space-x-2">
                      {mqttStatus?.hasCaCert && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">CA Root</span>
                      )}
                      {mqttStatus?.hasClientCert && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Cliente</span>
                      )}
                      {mqttStatus?.hasPrivateKey && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Clave</span>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="broker">MQTT Broker URL</Label>
                <Input
                  id="broker"
                  placeholder="a2fvfjwoybq3qw-ats.iot.us-east-2.amazonaws.com"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                />
                <p className="text-xs text-neutral-500 mt-1">Para AWS IoT: no incluyas el protocolo, se añadirá automáticamente según el tipo de conexión</p>
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
              
              <div className="border-t pt-4 mt-4">
                <Label className="text-md mb-3 block">Tipo de conexión</Label>
                <RadioGroup value={connectionType} onValueChange={setConnectionType} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="standard" id="standard-connection" />
                    <Label htmlFor="standard-connection" className="font-normal">Estándar (usuario/contraseña)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="certificate" id="certificate-connection" />
                    <Label htmlFor="certificate-connection" className="font-normal">Certificados TLS (AWS IoT)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {connectionType === 'standard' ? (
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="mqtt-user"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="caCert">Certificado CA (Autoridad Certificadora)</Label>
                    <Textarea
                      id="caCert"
                      placeholder="-----BEGIN CERTIFICATE-----"
                      value={caCert}
                      onChange={(e) => setCaCert(e.target.value)}
                      className="font-mono text-xs h-36"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Certificado Amazon Root CA, formato PEM</p>
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="clientCert">Certificado Cliente</Label>
                    <Textarea
                      id="clientCert"
                      placeholder="-----BEGIN CERTIFICATE-----"
                      value={clientCert}
                      onChange={(e) => setClientCert(e.target.value)}
                      className="font-mono text-xs h-36"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Certificado de dispositivo/cliente, formato PEM</p>
                  </div>
                  
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="privateKey">Clave Privada</Label>
                    <Textarea
                      id="privateKey"
                      placeholder="-----BEGIN RSA PRIVATE KEY-----"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      className="font-mono text-xs h-36"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Clave privada del certificado de cliente, formato PEM</p>
                  </div>
                </div>
              )}
              
              <Button onClick={handleConnectMqtt} className="w-full mt-2 btn-primary">
                Conectar a broker MQTT
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="devices">
          <div className="content-prototipo p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-[#2A363B]">Gestión de Dispositivos</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-descubrimiento</h4>
                  <p className="text-sm text-[#2A363B]">Descubrir y añadir automáticamente nuevos dispositivos</p>
                </div>
                <Switch id="auto-discovery" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notificaciones de estado</h4>
                  <p className="text-sm text-[#2A363B]">Recibir notificaciones cuando cambie el estado de un dispositivo</p>
                </div>
                <Switch id="status-notifications" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Alertas de batería baja</h4>
                  <p className="text-sm text-[#2A363B]">Notificar cuando el nivel de batería caiga por debajo del 20%</p>
                </div>
                <Switch id="battery-alerts" defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system">
          <div className="content-contacto p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-[#2A363B]">Configuración del Sistema</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Modo Oscuro</h4>
                  <p className="text-sm text-[#2A363B]">Cambiar entre tema claro y oscuro</p>
                </div>
                <Switch id="dark-mode" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Intervalo de actualización</h4>
                  <p className="text-sm text-[#2A363B]">Con qué frecuencia actualizar los datos en el panel</p>
                </div>
                <select className="bg-white border border-[#EBB7AA] rounded-lg py-1 px-3 text-sm">
                  <option value="5">5 segundos</option>
                  <option value="10" selected>10 segundos</option>
                  <option value="30">30 segundos</option>
                  <option value="60">1 minuto</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Retención de datos</h4>
                  <p className="text-sm text-[#2A363B]">Durante cuánto tiempo conservar datos históricos</p>
                </div>
                <select className="bg-white border border-[#EBB7AA] rounded-lg py-1 px-3 text-sm">
                  <option value="7">7 días</option>
                  <option value="30" selected>30 días</option>
                  <option value="90">90 días</option>
                  <option value="365">1 año</option>
                </select>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
