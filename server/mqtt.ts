import * as mqtt from 'mqtt';
import { storage } from './storage';
import { WebSocket } from 'ws';
import { log } from './vite';

class MqttClient {
  private client: mqtt.MqttClient | null = null;
  private topic: string = 'esp8266/+/+';
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
      this.client.subscribe(this.topic, (err) => {
        if (!err) {
          log(`Subscribed to topic: ${this.topic}`, 'mqtt');
        } else {
          log(`Error subscribing to topic: ${err.message}`, 'mqtt');
        }
      });
    }
  }

  private async handleMessage(topic: string, messageBuffer: Buffer) {
    try {
      const message = messageBuffer.toString();
      log(`Received message on topic ${topic}: ${message}`, 'mqtt');

      // Parse topic structure: esp8266/deviceId/sensorType
      const topicParts = topic.split('/');
      if (topicParts.length !== 3 || topicParts[0] !== 'esp8266') {
        log(`Invalid topic format: ${topic}`, 'mqtt');
        return;
      }

      const deviceId = topicParts[1];
      const sensorType = topicParts[2];

      // Parse message as JSON
      const data = JSON.parse(message);

      // Check if device exists, if not create it
      let device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        device = await storage.createDevice({
          deviceId,
          name: `New Device ${deviceId}`,
          type: 'Unknown',
          status: 'online',
          batteryLevel: data.battery || 100
        });
      } else {
        // Update device status and battery
        if (data.battery !== undefined) {
          await storage.updateDeviceBattery(deviceId, data.battery);
        }
      }

      // Store sensor data
      const sensorData = await storage.createSensorData({
        deviceId,
        sensorType,
        data
      });

      // Broadcast to WebSocket clients
      this.broadcastToClients({
        type: 'sensor_data',
        deviceId,
        sensorType,
        data,
        timestamp: sensorData.timestamp
      });

      // Update system metrics and broadcast
      const metrics = await storage.getSystemMetrics();
      this.broadcastToClients({
        type: 'system_metrics',
        metrics
      });

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

    const devices = ['ESP8266_01', 'ESP8266_02', 'ESP8266_03'];
    const sensorTypes = {
      'ESP8266_01': ['temperature', 'humidity'],
      'ESP8266_02': ['light'],
      'ESP8266_03': ['motion']
    };

    for (const deviceId of devices) {
      const batteryLevel = Math.floor(Math.random() * 100);
      
      for (const sensorType of sensorTypes[deviceId as keyof typeof sensorTypes]) {
        let data: any = { battery: batteryLevel };
        
        if (sensorType === 'temperature') {
          data.value = Math.random() * 10 + 20; // 20-30°C
          data.unit = '°C';
        } else if (sensorType === 'humidity') {
          data.value = Math.random() * 30 + 40; // 40-70%
          data.unit = '%';
        } else if (sensorType === 'light') {
          data.value = Math.random() * 1000 + 200; // 200-1200 lux
          data.unit = 'lux';
        } else if (sensorType === 'motion') {
          data.detected = Math.random() > 0.7;
        }
        
        const topic = `esp8266/${deviceId}/${sensorType}`;
        const message = JSON.stringify(data);
        
        if (this.client && this.client.connected) {
          this.client.publish(topic, message);
        }
      }
    }
  }
}

export const mqttClient = new MqttClient();
