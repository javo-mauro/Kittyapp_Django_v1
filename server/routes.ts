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
  // Endpoint para inicio de sesión
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      console.log(`Intento de inicio de sesión para: ${username}`);
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Se requiere nombre de usuario y contraseña' });
      }
      
      // Intentar buscar primero como usuario regular
      let user = await storage.getUserByUsername(username);
      console.log(`Usuario regular encontrado: ${user ? 'Sí' : 'No'}`);
      
      // Si no se encuentra como usuario regular, buscar como propietario de mascota
      if (!user) {
        console.log(`Buscando como propietario de mascota: ${username}`);
        const petOwner = await storage.getPetOwnerByUsername(username);
        console.log(`Propietario encontrado: ${petOwner ? 'Sí' : 'No'}`);
        
        if (petOwner) {
          console.log(`Detalles del propietario: ${JSON.stringify(petOwner)}`);
        }
        
        // Si es un propietario de mascota, crear un objeto de usuario compatible
        if (petOwner) {
          user = {
            id: petOwner.id,
            username: petOwner.username,
            password: petOwner.password,
            name: `${petOwner.name} ${petOwner.paternalLastName}`,
            role: 'owner',
            lastLogin: new Date()
          };
          console.log(`Usuario creado desde propietario: ${JSON.stringify(user)}`);
        }
      }
      
      // Si no se encontró el usuario en ninguna de las dos formas
      if (!user) {
        console.log(`Usuario no encontrado: ${username}`);
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      
      // Verificar contraseña (en una aplicación real usaríamos bcrypt)
      if (user.password !== password) {
        console.log(`Contraseña incorrecta para: ${username}`);
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      
      // Si es un usuario regular, actualizar último login
      if (await storage.getUser(user.id)) {
        await storage.updateUserLastLogin(user.id);
      }
      
      // Enviar usuario sin información sensible
      const { password: _, ...safeUser } = user;
      
      res.json({
        success: true,
        user: safeUser
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ message: 'Error al procesar la solicitud de inicio de sesión' });
    }
  });
  
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    // En una aplicación real, aquí invalidaríamos la sesión
    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  });
  
  app.get('/api/user/current', async (req: Request, res: Response) => {
    // En un sistema real, obtendríamos el ID del usuario de la sesión
    // Por ahora, usamos el ID proporcionado en la solicitud, o el usuario 1 por defecto
    const userId = parseInt(req.query.userId as string) || 1;
    const user = await storage.getUser(userId);
    
    if (user) {
      // Don't send password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });
  
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      // Obtener todos los usuarios del sistema desde el storage
      // Ahora solo mostramos a Javier Dayne como administrador
      const users = [
        { id: 1, username: 'admin', name: 'Javier Dayne', role: 'admin', lastLogin: new Date().toISOString() },
        { id: 2, username: 'jdayne', name: 'Javier Dayne', role: 'owner', lastLogin: new Date().toISOString() },
      ];
      
      res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ message: 'Error al obtener los usuarios del sistema' });
    }
  });

  app.post('/api/auth/switch-user', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: 'Se requiere el nombre de usuario' });
      }

      // Para este ejemplo, simulamos un cambio de usuario exitoso
      // Solo permitimos cambiar entre admin y jdayne
      if (username === 'admin' || username === 'jdayne') {
        // Verificar si ya existe el dispositivo
        const existingDevice = await storage.getDeviceByDeviceId('KPCL0021');
        
        if (!existingDevice) {
          // Asociamos un dispositivo específico al usuario
          const device = {
            deviceId: 'KPCL0021',
            name: 'KittyPaw de Malto',
            type: 'KittyPaw Collar',
            status: 'online',
            batteryLevel: 78,
            lastUpdate: new Date().toISOString()
          };
          await storage.createDevice(device);
          
          // Generar algunos datos de sensores para este dispositivo
          const sensorTypes = ['temperature', 'humidity', 'activity', 'weight'];
          const now = new Date();
          
          for (let i = 0; i < 10; i++) {
            const pastTime = new Date(now.getTime() - (i * 3600000)); // Horas atrás
            
            for (const type of sensorTypes) {
              let value = 0;
              let unit = '';
              
              switch (type) {
                case 'temperature':
                  value = 37 + (Math.random() * 2 - 1); // Entre 36 y 38
                  unit = '°C';
                  break;
                case 'humidity':
                  value = 45 + (Math.random() * 10); // Entre 45 y 55
                  unit = '%';
                  break;
                case 'activity':
                  value = Math.floor(Math.random() * 100); // Entre 0 y 100
                  unit = 'mov/h';
                  break;
                case 'weight':
                  value = 5 + (Math.random() * 0.5 - 0.25); // Entre 4.75 y 5.25
                  unit = 'kg';
                  break;
              }
              
              await storage.createSensorData({
                deviceId: 'KPCL0021',
                sensorType: type,
                data: { value, unit }
              });
            }
          }
        }

        let role = 'owner';
        let name = 'Javier Dayne';
        if (username === 'admin') {
          role = 'admin';
        }

        // Enviamos respuesta completa con toda la info del usuario
        res.json({ 
          success: true, 
          message: `Has cambiado al usuario ${username}`,
          user: { 
            id: username === 'admin' ? 1 : 2,
            username, 
            name,
            role, 
            lastLogin: new Date().toISOString() 
          }
        });
      } else {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
    } catch (error) {
      console.error('Error switching user:', error);
      res.status(500).json({ message: 'Error al cambiar de usuario' });
    }
  });

  app.get('/api/devices', async (req: Request, res: Response) => {
    try {
      // Verificar si se solicitan dispositivos para un usuario específico
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const username = req.query.username as string || null;
      
      // Obtener todos los dispositivos
      const allDevices = await storage.getDevices();
      
      // Si no hay filtro, devolver todos los dispositivos (sólo para admin)
      if (!userId && !username) {
        res.json(allDevices);
        return;
      }
      
      // Filtrar dispositivos según el usuario
      let filteredDevices = allDevices;
      
      // Permitir que jdayne y admin vean todos los dispositivos
      if (username === 'admin' || userId === 1) {
        filteredDevices = allDevices; // El admin ve todos los dispositivos
      }
      // Para usuario "jdayne" asegurar que vea ambos dispositivos
      else if (username === 'jdayne' || userId === 2) {
        filteredDevices = allDevices;
      }
      // Para otros usuarios, filtrar según las mascotas que tengan asociadas
      else if (userId) {
        // Obtener las mascotas del usuario
        const ownerPets = await storage.getPetsByOwnerId(userId);
        
        // Filtrar dispositivos que estén asociados con las mascotas del propietario
        if (ownerPets.length > 0) {
          const petDeviceIds = ownerPets
            .filter(pet => pet.kittyPawDeviceId)
            .map(pet => pet.kittyPawDeviceId);
          
          filteredDevices = allDevices.filter(device => 
            petDeviceIds.includes(device.deviceId)
          );
        } else {
          // Si el propietario no tiene mascotas, no mostrar dispositivos
          filteredDevices = [];
        }
      }
      
      res.json(filteredDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ message: 'Error retrieving devices' });
    }
  });

  app.post('/api/devices', async (req: Request, res: Response) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      
      // Suscribirnos al tópico del dispositivo recién creado
      if (device && device.deviceId) {
        mqttClient.addTopic(device.deviceId);
        log(`Auto-subscribing to new device topic: ${device.deviceId}`, 'express');
      }
      
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
      
      // Si se proporcionó un tópico adicional, suscribirse a él
      if (success && req.body.topic) {
        mqttClient.addTopic(req.body.topic);
      }
      
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
      console.log("Datos recibidos del cliente:", owner);
      const newOwner = await storage.createPetOwner(owner);
      console.log("Nuevo dueño creado:", newOwner);
      
      // Asegurarse de que estamos enviando los encabezados correctos
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(newOwner);
      console.log("Respuesta enviada al cliente:", JSON.stringify(newOwner));
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
      console.log("Datos de mascota recibidos:", pet);
      const newPet = await storage.createPet(pet);
      console.log("Nueva mascota creada:", newPet);
      
      // Si la mascota tiene un dispositivo KittyPaw asociado, suscribirnos al topic
      if (newPet.kittyPawDeviceId) {
        mqttClient.addTopic(newPet.kittyPawDeviceId);
        log(`Auto-subscribing to pet's KittyPaw device topic: ${newPet.kittyPawDeviceId}`, 'express');
      }
      
      // Asegurarse de que estamos enviando los encabezados correctos
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(newPet);
      console.log("Respuesta enviada al cliente:", JSON.stringify(newPet));
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

  // Endpoint para suscribirse a un nuevo tópico MQTT
  app.post('/api/mqtt/subscribe', async (req: Request, res: Response) => {
    try {
      const { topic } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "MQTT topic is required" });
      }
      
      mqttClient.addTopic(topic);
      return res.json({ success: true, message: `Subscribed to topic: ${topic}` });
    } catch (error) {
      console.error("Error subscribing to MQTT topic:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint para generar datos simulados para un dispositivo específico o todos los dispositivos
  app.post('/api/simulate-data', async (req: Request, res: Response) => {
    // La simulación de datos ha sido deshabilitada para usar solo datos reales del broker MQTT
    return res.status(403).json({ 
      success: false, 
      message: "La simulación de datos ha sido deshabilitada. Solo se procesan datos reales del broker MQTT."
    });
  });
  
  // Initialize the MQTT client
  await mqttClient.loadAndConnect();
  
  // Solo mantenemos la reconexión automática en caso de desconexión
  // y hemos eliminado toda generación de datos simulados
  if (dataGenerationInterval) {
    clearInterval(dataGenerationInterval);
    log('Desactivada la generación de datos simulados', 'express');
  }
  
  dataGenerationInterval = setInterval(() => {
    // Verificar si el cliente MQTT está conectado
    if (!mqttClient.isConnected()) {
      log('Cliente MQTT desconectado. Reintentando conexión...', 'express');
      mqttClient.loadAndConnect();
    }
  }, 60000);

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
