import * as mqtt from 'mqtt';
import { storage } from './storage';
import { WebSocket } from 'ws';
import { log } from './vite';

class MqttClient {
  private client: mqtt.MqttClient | null = null;
  private topics: Set<string> = new Set(['KPCL0021/pub']); // Conjunto de tópicos para suscribirse
  private connectionId: number | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private webSockets: Set<WebSocket> = new Set();

  async connect(
    brokerUrl: string, 
    clientId: string, 
    username?: string, 
    password?: string,
    caCert?: string,
    clientCert?: string,
    privateKey?: string
  ) {
    try {
      if (this.client) {
        await this.disconnect();
      }

      log(`Connecting to MQTT broker: ${brokerUrl}`, 'mqtt');

      const connectOptions: mqtt.IClientOptions = {
        clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      };

      // Autenticación estándar
      if (username && password) {
        connectOptions.username = username;
        connectOptions.password = password;
      }
      
      // Autenticación con certificados (AWS IoT)
      if (caCert && clientCert && privateKey) {
        log('Using certificate authentication for MQTT connection', 'mqtt');
        connectOptions.ca = caCert;
        connectOptions.cert = clientCert;
        connectOptions.key = privateKey;
        connectOptions.protocol = 'mqtts';
        connectOptions.rejectUnauthorized = true;
      }

      this.client = mqtt.connect(brokerUrl, connectOptions);

      this.client.on('connect', async () => {
        log('Connected to MQTT broker', 'mqtt');
        if (this.connectionId) {
          await storage.updateMqttConnectionStatus(this.connectionId, true);
        }
        this.subscribe();
        this.broadcastToClients({
          type: 'mqtt_status',
          status: 'connected',
          broker: brokerUrl
        });
      });

      this.client.on('error', (err) => {
        log(`MQTT client error: ${err.message}`, 'mqtt');
        this.broadcastToClients({
          type: 'mqtt_status',
          status: 'error',
          message: err.message
        });
      });

      this.client.on('offline', async () => {
        log('MQTT client offline', 'mqtt');
        if (this.connectionId) {
          await storage.updateMqttConnectionStatus(this.connectionId, false);
        }
        this.broadcastToClients({
          type: 'mqtt_status',
          status: 'disconnected'
        });
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      return true;
    } catch (error) {
      log(`Failed to connect to MQTT broker: ${error}`, 'mqtt');
      return false;
    }
  }

  async disconnect() {
    return new Promise<void>((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }

      if (this.client.connected) {
        this.client.end(false, () => {
          this.client = null;
          resolve();
        });
      } else {
        this.client = null;
        resolve();
      }
    });
  }

  private subscribe() {
    if (this.client && this.client.connected) {
      // Suscribirse a todos los tópicos del conjunto
      Array.from(this.topics).forEach(topic => {
        this.client!.subscribe(topic, (err) => {
          if (!err) {
            log(`Subscribed to topic: ${topic}`, 'mqtt');
          } else {
            log(`Error subscribing to topic: ${err.message}`, 'mqtt');
          }
        });
      });
    }
  }
  
  // Método para agregar un nuevo tópico y suscribirse
  public addTopic(topic: string) {
    // Asegurarse de que si el tópico es un ID de dispositivo, tenga el formato correcto con /pub
    if (!topic.includes('/')) {
      topic = `${topic}/pub`;
      log(`Formateando tópico como ${topic} para asegurar el formato correcto`, 'mqtt');
    }
    
    if (!this.topics.has(topic)) {
      this.topics.add(topic);
      log(`Added new topic: ${topic}`, 'mqtt');
      
      // Si ya estamos conectados, suscribirse inmediatamente
      if (this.client && this.client.connected) {
        this.client.subscribe(topic, (err) => {
          if (!err) {
            log(`Subscribed to new topic: ${topic}`, 'mqtt');
          } else {
            log(`Error subscribing to new topic: ${err.message}`, 'mqtt');
          }
        });
      }
    }
  }

  private async handleMessage(topic: string, messageBuffer: Buffer) {
    try {
      const message = messageBuffer.toString();
      log(`Received message on topic ${topic}: ${message}`, 'mqtt');

      // Procesamos cualquier tópico al que estemos suscritos
      // Verificamos si el formato del mensaje es correcto para un dispositivo KittyPaw
      
      try {
        // Parse message según formato: {"device_id": "THINGNAME", "timestamp": "...", "humidity": h, "temperature": t, "light": light, "weight": weight}
        const kpcData = JSON.parse(message);
        const deviceId = kpcData.device_id;
        
        if (!deviceId) {
          log(`Invalid KPCL0021 message format, missing device_id: ${message}`, 'mqtt');
          return;
        }
        
        // Check if device exists, if not create it
        let device = await storage.getDeviceByDeviceId(deviceId);
        if (!device) {
          device = await storage.createDevice({
            deviceId,
            name: `Kitty Paw Device ${deviceId}`,
            type: 'KittyPaw',
            status: 'online',
            batteryLevel: 100
          });
        }
        
        // Procesar los diferentes tipos de sensores incluidos en el mensaje (humidity, temperature, light, weight)
        // y crearlos como sensores independientes
        
        // Procesar temperatura
        if (kpcData.temperature !== undefined) {
          const tempData = {
            value: kpcData.temperature,
            unit: '°C',
            timestamp: kpcData.timestamp
          };
          
          const sensorData = await storage.createSensorData({
            deviceId,
            sensorType: 'temperature',
            data: tempData
          });
          
          this.broadcastToClients({
            type: 'sensor_data',
            deviceId,
            sensorType: 'temperature',
            data: tempData,
            timestamp: sensorData.timestamp
          });
        }
        
        // Procesar humedad
        if (kpcData.humidity !== undefined) {
          const humidityData = {
            value: kpcData.humidity,
            unit: '%',
            timestamp: kpcData.timestamp
          };
          
          const sensorData = await storage.createSensorData({
            deviceId,
            sensorType: 'humidity',
            data: humidityData
          });
          
          this.broadcastToClients({
            type: 'sensor_data',
            deviceId,
            sensorType: 'humidity',
            data: humidityData,
            timestamp: sensorData.timestamp
          });
        }
        
        // Procesar luz
        if (kpcData.light !== undefined) {
          const lightData = {
            value: kpcData.light,
            unit: 'lux',
            timestamp: kpcData.timestamp
          };
          
          const sensorData = await storage.createSensorData({
            deviceId,
            sensorType: 'light',
            data: lightData
          });
          
          this.broadcastToClients({
            type: 'sensor_data',
            deviceId,
            sensorType: 'light',
            data: lightData,
            timestamp: sensorData.timestamp
          });
        }
        
        // Procesar peso
        if (kpcData.weight !== undefined) {
          const weightData = {
            value: kpcData.weight,
            unit: 'g',
            timestamp: kpcData.timestamp
          };
          
          const sensorData = await storage.createSensorData({
            deviceId,
            sensorType: 'weight',
            data: weightData
          });
          
          this.broadcastToClients({
            type: 'sensor_data',
            deviceId,
            sensorType: 'weight',
            data: weightData,
            timestamp: sensorData.timestamp
          });
        }
        
        // Update system metrics and broadcast
        const metrics = await storage.getSystemMetrics();
        this.broadcastToClients({
          type: 'system_metrics',
          metrics
        });
      } catch (error) {
        log(`Error processing MQTT message on topic ${topic}: ${error}`, 'mqtt');
      }
    } catch (error) {
      log(`Error handling MQTT message: ${error}`, 'mqtt');
    }
  }

  addWebSocket(ws: WebSocket) {
    this.webSockets.add(ws);
    log(`WebSocket client connected. Total clients: ${this.webSockets.size}`, 'mqtt');

    // Send initial connection status
    if (this.client) {
      ws.send(JSON.stringify({
        type: 'mqtt_status',
        status: this.client.connected ? 'connected' : 'disconnected',
      }));
    }
  }

  removeWebSocket(ws: WebSocket) {
    this.webSockets.delete(ws);
    log(`WebSocket client disconnected. Total clients: ${this.webSockets.size}`, 'mqtt');
  }

  private broadcastToClients(data: any) {
    const message = JSON.stringify(data);
    // Convert Set to Array before iteration to avoid ES2015 target issues
    Array.from(this.webSockets).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  async loadAndConnect() {
    try {
      // Get the first MQTT connection from storage
      const connections = await storage.getMqttConnectionByUserId(1); // Using the default admin user
      
      if (connections) {
        this.connectionId = connections.id;
        await this.connect(
          connections.brokerUrl,
          connections.clientId,
          connections.username || undefined,
          connections.password || undefined,
          connections.caCert || undefined,
          connections.clientCert || undefined,
          connections.privateKey || undefined
        );
        return true;
      } else {
        // Use a public MQTT broker for testing if no connection is configured
        log('No MQTT connection found in storage, using public test broker', 'mqtt');
        const defaultBrokerUrl = 'mqtt://broker.emqx.io:1883';
        const defaultClientId = `kitty-paw-${Math.random().toString(16).substring(2, 10)}`;
        
        // Create a default connection in storage
        const newConnection = await storage.createMqttConnection({
          userId: 1,
          brokerUrl: defaultBrokerUrl, 
          clientId: defaultClientId
        });
        
        this.connectionId = newConnection.id;
        await this.connect(defaultBrokerUrl, defaultClientId);
        return true;
      }
    } catch (error) {
      log(`Error loading MQTT connection: ${error}`, 'mqtt');
      return false;
    }
  }

  // Generate some random sensor data for testing (when real data isn't available)
  async generateRandomData() {
    if (!this.client || !this.client.connected) {
      return;
    }
    
    // Solo generar datos para el tópico KPCL0021/pub con el formato especificado
    const kpcData = {
      device_id: "KPCL0021",
      timestamp: new Date().toISOString(),
      humidity: Math.random() * 30 + 40, // 40-70%
      temperature: Math.random() * 10 + 20, // 20-30°C
      light: Math.random() * 1000 + 200, // 200-1200 lux
      weight: Math.floor(Math.random() * 500) + 100 // 100-600g
    };
    
    const kpcMessage = JSON.stringify(kpcData);
    
    if (this.client && this.client.connected) {
      this.client.publish('KPCL0021/pub', kpcMessage);
      log(`Published test message to KPCL0021/pub: ${kpcMessage}`, 'mqtt');
    }
  }
}

export const mqttClient = new MqttClient();
