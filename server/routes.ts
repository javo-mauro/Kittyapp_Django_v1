import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mqttClient } from "./mqtt";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { insertDeviceSchema, insertUserSchema, insertMqttConnectionSchema } from "@shared/schema";
import { log } from "./vite";

// Handles initial setup and regular data generation when no real MQTT data is available
let dataGenerationInterval: NodeJS.Timeout | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    // Add client to MQTT broadcast list
    mqttClient.addWebSocket(ws);

    // Handle WebSocket messages from clients
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        if (data.type === 'connect_mqtt' && data.broker && data.clientId) {
          const success = await mqttClient.connect(data.broker, data.clientId, data.username, data.password);
          ws.send(JSON.stringify({ 
            type: 'mqtt_status', 
            status: success ? 'connected' : 'connection_error',
            broker: data.broker 
          }));
        }
      } catch (error) {
        log(`WebSocket message error: ${error}`, 'ws');
      }
    });

    // Remove client when disconnected
    ws.on('close', () => {
      mqttClient.removeWebSocket(ws);
    });

    // Send initial data to the client
    sendInitialData(ws);
  });

  // API routes
  app.get('/api/user/current', async (req: Request, res: Response) => {
    // Just return the first user for demo purposes
    const user = await storage.getUser(1);
    if (user) {
      // Don't send password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });

  app.get('/api/devices', async (req: Request, res: Response) => {
    const devices = await storage.getDevices();
    res.json(devices);
  });

  app.post('/api/devices', async (req: Request, res: Response) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create device' });
      }
    }
  });

  app.get('/api/devices/:deviceId', async (req: Request, res: Response) => {
    const device = await storage.getDeviceByDeviceId(req.params.deviceId);
    if (device) {
      res.json(device);
    } else {
      res.status(404).json({ message: 'Device not found' });
    }
  });

  app.get('/api/sensor-data/:deviceId', async (req: Request, res: Response) => {
    const { deviceId } = req.params;
    const { type, limit } = req.query;
    
    let data;
    if (type) {
      data = await storage.getSensorDataByType(
        deviceId, 
        type as string, 
        limit ? parseInt(limit as string) : undefined
      );
    } else {
      data = await storage.getSensorData(
        deviceId, 
        limit ? parseInt(limit as string) : undefined
      );
    }
    
    res.json(data);
  });

  app.get('/api/latest-readings', async (req: Request, res: Response) => {
    const readings = await storage.getLatestReadings();
    res.json(readings);
  });

  app.get('/api/system/metrics', async (req: Request, res: Response) => {
    const metrics = await storage.getSystemMetrics();
    res.json(metrics);
  });

  app.get('/api/system/info', async (req: Request, res: Response) => {
    res.json({
      version: "v2.1.0",
      mqttVersion: "v1.4.3",
      lastUpdate: "2023-10-14"
    });
  });

  app.get('/api/mqtt/status', async (req: Request, res: Response) => {
    const connection = await storage.getMqttConnectionByUserId(1);
    if (connection) {
      // Don't send password or certificate information in the response
      const { password, caCert, clientCert, privateKey, ...safeConnection } = connection;
      
      // Indicar sin revelar contenido si los certificados están presentes
      const connectionInfo = {
        ...safeConnection,
        hasCaCert: !!caCert,
        hasClientCert: !!clientCert,
        hasPrivateKey: !!privateKey
      };
      
      res.json(connectionInfo);
    } else {
      res.status(404).json({ message: 'MQTT connection not found' });
    }
  });

  app.post('/api/mqtt/connect', async (req: Request, res: Response) => {
    try {
      const connectionData = insertMqttConnectionSchema.parse(req.body);
      const connection = await storage.createMqttConnection(connectionData);
      
      // Try to connect with the new credentials
      const success = await mqttClient.connect(
        connection.brokerUrl,
        connection.clientId,
        connection.username || undefined,
        connection.password || undefined,
        connection.caCert || undefined,
        connection.clientCert || undefined,
        connection.privateKey || undefined
      );
      
      if (success) {
        // Excluir la contraseña y certificados confidenciales de la respuesta
        const { password, caCert, clientCert, privateKey, ...safeConnection } = connection;
        res.status(201).json({ ...safeConnection, connected: true });
      } else {
        res.status(400).json({ message: 'Failed to connect to MQTT broker' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create MQTT connection' });
      }
    }
  });

  // Pet owner endpoints
  app.get('/api/pet-owners', async (req: Request, res: Response) => {
    try {
      const owners = await storage.getPetOwners();
      res.json(owners);
    } catch (error) {
      console.error('Error fetching pet owners:', error);
      res.status(500).json({ message: 'Error al obtener los dueños de mascotas' });
    }
  });

  app.get('/api/pet-owners/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = await storage.getPetOwner(id);
      
      if (!owner) {
        return res.status(404).json({ message: 'Dueño no encontrado' });
      }
      
      res.json(owner);
    } catch (error) {
      console.error('Error fetching pet owner:', error);
      res.status(500).json({ message: 'Error al obtener el dueño de mascota' });
    }
  });

  app.post('/api/pet-owners', async (req: Request, res: Response) => {
    try {
      const owner = req.body;
      const newOwner = await storage.createPetOwner(owner);
      res.status(201).json(newOwner);
    } catch (error) {
      console.error('Error creating pet owner:', error);
      res.status(500).json({ message: 'Error al crear el dueño de mascota' });
    }
  });

  app.put('/api/pet-owners/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const owner = req.body;
      const updatedOwner = await storage.updatePetOwner(id, owner);
      res.json(updatedOwner);
    } catch (error) {
      console.error('Error updating pet owner:', error);
      res.status(500).json({ message: 'Error al actualizar el dueño de mascota' });
    }
  });

  app.delete('/api/pet-owners/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deletePetOwner(id);
      
      if (!result) {
        return res.status(404).json({ message: 'Dueño no encontrado' });
      }
      
      res.json({ message: 'Dueño eliminado con éxito' });
    } catch (error) {
      console.error('Error deleting pet owner:', error);
      res.status(500).json({ message: 'Error al eliminar el dueño de mascota' });
    }
  });

  // Pet endpoints
  app.get('/api/pets', async (req: Request, res: Response) => {
    try {
      const pets = await storage.getPets();
      res.json(pets);
    } catch (error) {
      console.error('Error fetching pets:', error);
      res.status(500).json({ message: 'Error al obtener las mascotas' });
    }
  });

  app.get('/api/pets/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const pet = await storage.getPet(id);
      
      if (!pet) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      res.json(pet);
    } catch (error) {
      console.error('Error fetching pet:', error);
      res.status(500).json({ message: 'Error al obtener la mascota' });
    }
  });

  app.get('/api/pet-owners/:ownerId/pets', async (req: Request, res: Response) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const pets = await storage.getPetsByOwnerId(ownerId);
      res.json(pets);
    } catch (error) {
      console.error('Error fetching owner pets:', error);
      res.status(500).json({ message: 'Error al obtener las mascotas del dueño' });
    }
  });

  app.post('/api/pets', async (req: Request, res: Response) => {
    try {
      const pet = req.body;
      const newPet = await storage.createPet(pet);
      res.status(201).json(newPet);
    } catch (error) {
      console.error('Error creating pet:', error);
      res.status(500).json({ message: 'Error al crear la mascota' });
    }
  });

  app.put('/api/pets/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const pet = req.body;
      const updatedPet = await storage.updatePet(id, pet);
      res.json(updatedPet);
    } catch (error) {
      console.error('Error updating pet:', error);
      res.status(500).json({ message: 'Error al actualizar la mascota' });
    }
  });

  app.delete('/api/pets/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deletePet(id);
      
      if (!result) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      res.json({ message: 'Mascota eliminada con éxito' });
    } catch (error) {
      console.error('Error deleting pet:', error);
      res.status(500).json({ message: 'Error al eliminar la mascota' });
    }
  });

  app.get('/api/devices/:deviceId/pet', async (req: Request, res: Response) => {
    try {
      const deviceId = req.params.deviceId;
      const pet = await storage.getPetByKittyPawDeviceId(deviceId);
      
      if (!pet) {
        return res.status(404).json({ message: 'No se encontró mascota asociada a este dispositivo' });
      }
      
      res.json(pet);
    } catch (error) {
      console.error('Error fetching pet by device:', error);
      res.status(500).json({ message: 'Error al obtener la mascota por dispositivo' });
    }
  });

  // Initialize the MQTT client
  await mqttClient.loadAndConnect();

  // If we don't have real data, generate some random data every 10 seconds
  if (dataGenerationInterval) {
    clearInterval(dataGenerationInterval);
  }
  dataGenerationInterval = setInterval(() => {
    mqttClient.generateRandomData();
  }, 10000);

  return httpServer;
}

async function sendInitialData(ws: WebSocket) {
  try {
    // Send system metrics
    const metrics = await storage.getSystemMetrics();
    ws.send(JSON.stringify({
      type: 'system_metrics',
      metrics
    }));

    // Send device list
    const devices = await storage.getDevices();
    ws.send(JSON.stringify({
      type: 'devices',
      devices
    }));

    // Send latest sensor readings
    const readings = await storage.getLatestReadings();
    ws.send(JSON.stringify({
      type: 'latest_readings',
      readings
    }));

    // Send system info
    ws.send(JSON.stringify({
      type: 'system_info',
      info: {
        version: "v2.1.0",
        mqttVersion: "v1.4.3",
        lastUpdate: "2023-10-14"
      }
    }));
  } catch (error) {
    log(`Error sending initial data: ${error}`, 'ws');
  }
}
