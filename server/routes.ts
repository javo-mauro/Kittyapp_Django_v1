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
      // Obtener el rol del usuario desde los parámetros de consulta o el usuario actual
      const userRole = req.query.role as string;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin'; // Solo basarse en el rol
      
      // Si el usuario no es administrador, solo devuelve su propio perfil
      if (!isAdmin && userId) {
        // Buscar el usuario específico
        const userInfo = { id: userId };
        
        // Buscar si es un propietario de mascotas
        const petOwner = await storage.getPetOwner(userId);
        
        if (petOwner) {
          // Combinar información para crear perfil
          const ownerProfile = {
            id: petOwner.id,
            username: petOwner.username,
            name: `${petOwner.name} ${petOwner.paternalLastName}`,
            role: 'owner',
            lastLogin: new Date().toISOString()
          };
          
          return res.json([ownerProfile]);
        }
        
        // Si no se encuentra, devolver array vacío
        return res.json([]);
      }
      
      // Para administradores, devolver lista completa de usuarios
      if (isAdmin) {
        const admin = { 
          id: 1, 
          username: 'admin', 
          name: 'Javier Dayne', 
          role: 'admin', 
          lastLogin: new Date().toISOString() 
        };
        
        // Obtener todos los propietarios de mascotas
        const petOwners = await storage.getPetOwners();
        const ownerProfiles = petOwners.map(owner => ({
          id: owner.id,
          username: owner.username,
          name: `${owner.name} ${owner.paternalLastName}`,
          role: 'owner',
          lastLogin: owner.updatedAt.toISOString()
        }));
        
        // Combinamos admin con propietarios
        const allUsers = [admin, ...ownerProfiles];
        
        res.json(allUsers);
      } else {
        // Si no hay userId ni es admin, devolver array vacío por seguridad
        res.json([]);
      }
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
      // Obtener parámetros de usuario
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Obtener todos los dispositivos
      const allDevices = await storage.getDevices();
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Si es admin, devolver todos los dispositivos
      if (isAdmin) {
        return res.json(allDevices);
      }
      
      // Si es un usuario normal, filtrar dispositivos según sus mascotas
      if (userId) {
        // Obtener dispositivos filtrados por mascotas del usuario
        const filteredDevices = await filterDevicesByUserPets(userId);
        return res.json(filteredDevices);
      }
      
      // Si no hay información de usuario, no devolver dispositivos (por seguridad)
      res.json([]);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ message: 'Error retrieving devices' });
    }
  });

  app.post('/api/devices', async (req: Request, res: Response) => {
    try {
      console.log("Datos recibidos para crear dispositivo:", req.body);
      
      // Crear un objeto con las propiedades correctas para el esquema
      const deviceToCreate = {
        deviceId: req.body.deviceId,
        name: req.body.name,
        type: req.body.type,
        status: req.body.status || 'offline',
        batteryLevel: req.body.batteryLevel || 100,
        ipAddress: req.body.ipAddress || null
      };
      
      console.log("Datos procesados para crear dispositivo:", deviceToCreate);
      
      // Validar con el esquema
      const deviceData = insertDeviceSchema.parse(deviceToCreate);
      const device = await storage.createDevice(deviceData);
      
      console.log("Dispositivo creado con éxito:", device);
      
      // Suscribirnos al tópico del dispositivo recién creado
      if (device && device.deviceId) {
        mqttClient.addTopic(device.deviceId);
        log(`Auto-subscribing to new device topic: ${device.deviceId}`, 'express');
      }
      
      res.status(201).json(device);
    } catch (error) {
      console.error("Error creando dispositivo:", error);
      
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(e => {
          return `Campo ${e.path.join('.')}: ${e.message}`;
        }).join(', ');
        
        console.error("Error de validación:", formattedErrors);
        res.status(400).json({ message: `Error de validación: ${formattedErrors}` });
      } else {
        // Log detallado del error
        console.error("Error de servidor:", error);
        res.status(500).json({ message: 'Error al crear el dispositivo. Detalles: ' + (error.message || 'Error desconocido') });
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
    try {
      const { deviceId } = req.params;
      const { type, limit } = req.query;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene acceso a este dispositivo
      const isAdmin = userRole === 'admin';
      
      // Si no es admin, verificar que el dispositivo pertenezca al usuario
      if (!isAdmin && userId) {
        const userDevices = await filterDevicesByUserPets(userId);
        const deviceAllowed = userDevices.some(device => device.deviceId === deviceId);
        
        if (!deviceAllowed) {
          return res.status(403).json({ 
            message: 'No tienes permiso para ver datos de este dispositivo' 
          });
        }
      }
      
      // Obtener los datos del sensor
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
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      res.status(500).json({ message: 'Error al obtener datos del sensor' });
    }
  });

  app.get('/api/latest-readings', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Obtener todas las lecturas
      const allReadings = await storage.getLatestReadings();
      
      // Si es admin, devolver todas las lecturas
      if (isAdmin) {
        return res.json(allReadings);
      }
      
      // Si es un usuario normal, filtrar lecturas según sus dispositivos
      if (userId) {
        // Obtener dispositivos filtrados por mascotas del usuario
        const userDevices = await filterDevicesByUserPets(userId);
        const userDeviceIds = userDevices.map(device => device.deviceId);
        
        // Filtrar lecturas que pertenecen a dispositivos del usuario
        const filteredReadings = allReadings.filter(reading => 
          userDeviceIds.includes(reading.deviceId)
        );
        
        return res.json(filteredReadings);
      }
      
      // Si no hay información de usuario, no devolver lecturas (por seguridad)
      res.json([]);
    } catch (error) {
      console.error('Error fetching latest readings:', error);
      res.status(500).json({ message: 'Error al obtener las últimas lecturas' });
    }
  });

  app.get('/api/system/metrics', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Obtener métricas completas del sistema
      const allMetrics = await storage.getSystemMetrics();
      
      // Si es admin, devolver todas las métricas
      if (userRole === 'admin') {
        return res.json(allMetrics);
      }
      
      // Si es un usuario normal, ajustar las métricas según sus dispositivos
      if (userId) {
        const userDevices = await filterDevicesByUserPets(userId);
        
        // Métricas personalizadas para el usuario
        const userMetrics = {
          activeDevices: userDevices.filter(d => d.status === 'online').length,
          activeSensors: userDevices.length,  // Estimación simplificada
          alerts: 0,  // Se podría personalizar si hay un sistema de alertas
          lastUpdate: allMetrics.lastUpdate
        };
        
        return res.json(userMetrics);
      }
      
      // Si no hay información de usuario, devolver métricas genéricas
      res.json({
        activeDevices: 0,
        activeSensors: 0,
        alerts: 0,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      res.status(500).json({ message: 'Error al obtener métricas del sistema' });
    }
  });

  app.get('/api/system/info', async (req: Request, res: Response) => {
    res.json({
      version: "v2.1.0",
      mqttVersion: "v1.4.3",
      lastUpdate: "2023-10-14"
    });
  });

  app.get('/api/mqtt/status', async (req: Request, res: Response) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    const userRole = req.query.role as string;
    
    // Si es admin, obtener la conexión del sistema (ID 1)
    // Si es usuario normal, obtener su propia conexión
    const targetUserId = userRole === 'admin' ? 1 : userId;
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'Se requiere ID de usuario' });
    }
    
    const connection = await storage.getMqttConnectionByUserId(targetUserId);
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Si es admin, devolver todos los dueños
      if (isAdmin) {
        const owners = await storage.getPetOwners();
        return res.json(owners);
      }
      
      // Si es un usuario normal, solo devolver su información
      if (userId) {
        const owner = await storage.getPetOwner(userId);
        if (owner) {
          return res.json([owner]);
        }
      }
      
      // Si no tiene permisos, devolver array vacío
      res.json([]);
    } catch (error) {
      console.error('Error fetching pet owners:', error);
      res.status(500).json({ message: 'Error al obtener los dueños de mascotas' });
    }
  });

  app.get('/api/pet-owners/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene privilegios
      const isAdmin = userRole === 'admin';
      
      // Si no es admin, verificar que esté solicitando su propia información
      if (!isAdmin && userId !== id) {
        return res.status(403).json({ 
          message: 'No tienes permiso para ver información de otro usuario' 
        });
      }
      
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
      const ownerData = req.body;
      console.log("Datos recibidos del cliente:", ownerData);
      
      // Formatear la dirección completa
      const address = [
        ownerData.street || "",
        ownerData.number || "",
        ownerData.city || "",
        ownerData.district || "",
        ownerData.addressDetails || ""
      ].filter(Boolean).join(", ");
      
      // Procesar la fecha de nacimiento
      let birthDate: Date;
      try {
        // Si se proporciona como cadena, intentar convertir a Date
        if (typeof ownerData.birthDate === 'string') {
          // Para formatos como "DD/MM/YYYY"
          if (ownerData.birthDate.includes('/')) {
            const parts = ownerData.birthDate.split('/');
            birthDate = new Date(
              parseInt(parts[2]), // año
              parseInt(parts[1]) - 1, // mes (0-11)
              parseInt(parts[0]) // día
            );
          } else {
            // Intentar analizar como fecha ISO o similar
            birthDate = new Date(ownerData.birthDate);
          }
        } else {
          // Si ya es un objeto Date, usarlo directamente
          birthDate = new Date(ownerData.birthDate);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(birthDate.getTime())) {
          throw new Error("Fecha de nacimiento inválida");
        }
      } catch (err) {
        console.error("Error procesando fecha:", err);
        // Usar una fecha por defecto en caso de error
        birthDate = new Date();
      }
      
      // Preparar datos para crear el dueño
      const ownerToCreate = {
        name: ownerData.name,
        paternalLastName: ownerData.paternalLastName,
        maternalLastName: ownerData.maternalLastName || null,
        address: address,
        birthDate: birthDate,
        email: ownerData.email,
        username: ownerData.username,
        password: ownerData.password
      };
      
      const newOwner = await storage.createPetOwner(ownerToCreate);
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      const owner = req.body;
      
      // Verificar si el usuario tiene privilegios
      const isAdmin = userRole === 'admin';
      
      // Si no es admin, verificar que esté actualizando su propia información
      if (!isAdmin && userId !== id) {
        return res.status(403).json({ 
          message: 'No tienes permiso para modificar información de otro usuario' 
        });
      }
      
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene privilegios
      const isAdmin = userRole === 'admin';
      
      // Solo administradores o el propio usuario pueden eliminar un perfil
      if (!isAdmin && userId !== id) {
        return res.status(403).json({ 
          message: 'No tienes permiso para eliminar a otro usuario' 
        });
      }
      
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Si es admin, devolver todas las mascotas
      if (isAdmin) {
        const pets = await storage.getPets();
        return res.json(pets);
      }
      
      // Si es un usuario normal, solo devolver sus mascotas
      if (userId) {
        const userPets = await storage.getPetsByOwnerId(userId);
        return res.json(userPets);
      }
      
      // Si no hay información de usuario, no devolver mascotas
      res.json([]);
    } catch (error) {
      console.error('Error fetching pets:', error);
      res.status(500).json({ message: 'Error al obtener las mascotas' });
    }
  });

  app.get('/api/pets/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Obtener la mascota
      const pet = await storage.getPet(id);
      
      if (!pet) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Si no es admin, verificar que la mascota pertenezca al usuario
      if (!isAdmin && userId !== pet.ownerId) {
        return res.status(403).json({ 
          message: 'No tienes permiso para ver esta mascota' 
        });
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Si no es admin, verificar que esté solicitando sus propias mascotas
      if (!isAdmin && userId !== ownerId) {
        return res.status(403).json({ 
          message: 'No tienes permiso para ver las mascotas de otro usuario' 
        });
      }
      
      const pets = await storage.getPetsByOwnerId(ownerId);
      res.json(pets);
    } catch (error) {
      console.error('Error fetching owner pets:', error);
      res.status(500).json({ message: 'Error al obtener las mascotas del dueño' });
    }
  });

  app.post('/api/pets', async (req: Request, res: Response) => {
    try {
      const petData = req.body;
      console.log("Datos de mascota recibidos:", petData);
      
      // Función para procesar las fechas
      const processDate = (dateString: string | Date | null | undefined): Date | null => {
        if (!dateString) return null;
        
        try {
          // Si es cadena, convertir a objeto Date
          if (typeof dateString === 'string') {
            return new Date(dateString);
          }
          // Si ya es un objeto Date, usarlo directamente
          return dateString as Date;
        } catch (err) {
          console.error("Error procesando fecha:", err);
          return null;
        }
      };
      
      // Verificar y crear el dispositivo si no existe
      let deviceId = petData.kittyPawDeviceId;
      if (deviceId) {
        // Verificar si el dispositivo existe
        const existingDevice = await storage.getDeviceByDeviceId(deviceId);
        
        if (!existingDevice) {
          // El dispositivo no existe, vamos a crearlo
          log(`Dispositivo ${deviceId} no encontrado, creando uno nuevo...`, 'express');
          
          // Obtener el nombre para el dispositivo del nombre de la mascota
          const deviceName = `Dispositivo para ${petData.name}`;
          
          // Crear el dispositivo
          const newDevice = await storage.createDevice({
            deviceId: deviceId,
            name: deviceName,
            type: 'KittyPaw Collar', // Tipo predeterminado
            status: 'offline',       // Estado inicial
            batteryLevel: 100,       // Nivel de batería inicial
            ipAddress: null          // Sin dirección IP inicial
          });
          
          console.log("Nuevo dispositivo creado:", newDevice);
          
          // Suscribirnos al tópico del nuevo dispositivo
          mqttClient.addTopic(deviceId);
          log(`Auto-subscribing to new device topic: ${deviceId}`, 'express');
        }
      }
      
      // Crear un objeto con fechas procesadas adecuadamente
      const petToCreate = {
        ...petData,
        acquisitionDate: processDate(petData.acquisitionDate) || new Date(),
        birthDate: processDate(petData.birthDate),
        lastVetVisit: processDate(petData.lastVetVisit),
        // Asegurarnos de que los booleanos sean correctos
        hasVaccinations: petData.hasVaccinations === true || petData.hasVaccinations === 'true',
        hasDiseases: petData.hasDiseases === true || petData.hasDiseases === 'true',
        // Asegurarnos de que el ID del propietario sea un número
        ownerId: typeof petData.ownerId === 'string' ? parseInt(petData.ownerId) : petData.ownerId,
        // Si el dispositivo está vacío, establecerlo como null
        kittyPawDeviceId: deviceId || null
      };
      
      console.log("Datos de mascota procesados:", petToCreate);
      const newPet = await storage.createPet(petToCreate);
      console.log("Nueva mascota creada:", newPet);
      
      // Asegurarse de que estamos enviando los encabezados correctos
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(newPet);
      console.log("Respuesta enviada al cliente:", JSON.stringify(newPet));
    } catch (error) {
      console.error('Error creating pet:', error);
      
      // Proporcionar un mensaje de error más descriptivo
      let errorMessage = 'Error al crear la mascota';
      
      // Intentar extraer detalles útiles del error para el cliente
      if (error instanceof Error) {
        // Verificar si es un error de PostgreSQL con detalles
        const pgError = error as any;
        if (pgError.detail) {
          // Proporcionar un mensaje más amigable basado en el error específico
          if (pgError.code === '23503' && pgError.constraint === 'pets_kitty_paw_device_id_fkey') {
            errorMessage = `El dispositivo especificado no existe. Por favor, crea primero el dispositivo o deja el campo en blanco.`;
          } 
          else if (pgError.code === '23503' && pgError.constraint === 'pets_owner_id_fkey') {
            errorMessage = `El propietario especificado no existe. Por favor, selecciona un propietario válido.`;
          }
          else if (pgError.code === '23505') {
            errorMessage = `Ya existe una mascota con ese número de chip. Por favor, usa un número de chip único.`;
          }
        }
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  app.put('/api/pets/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      const petData = req.body;
      console.log("Datos de actualización de mascota recibidos:", petData);
      
      // Verificar si el usuario tiene permisos para actualizar esta mascota
      const existingPet = await storage.getPet(id);
      if (!existingPet) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Verificar que la mascota pertenezca al usuario o que sea administrador
      if (!isAdmin && userId !== existingPet.ownerId) {
        return res.status(403).json({ 
          message: 'No tienes permiso para modificar esta mascota' 
        });
      }
      
      // Función para procesar las fechas
      const processDate = (dateString: string | Date | null | undefined): Date | null => {
        if (!dateString) return null;
        
        try {
          // Si es cadena, convertir a objeto Date
          if (typeof dateString === 'string') {
            return new Date(dateString);
          }
          // Si ya es un objeto Date, usarlo directamente
          return dateString as Date;
        } catch (err) {
          console.error("Error procesando fecha:", err);
          return null;
        }
      };
      
      // Verificar y crear el dispositivo si no existe
      let deviceId = petData.kittyPawDeviceId;
      if (deviceId) {
        // Verificar si el dispositivo existe
        const existingDevice = await storage.getDeviceByDeviceId(deviceId);
        
        if (!existingDevice) {
          // El dispositivo no existe, vamos a crearlo
          log(`Dispositivo ${deviceId} no encontrado, creando uno nuevo...`, 'express');
          
          // Obtener nombre de mascota o usar un valor predeterminado
          const deviceName = petData.name ? 
            `Dispositivo para ${petData.name}` : 
            `Dispositivo ${deviceId}`;
          
          // Crear el dispositivo
          const newDevice = await storage.createDevice({
            deviceId: deviceId,
            name: deviceName,
            type: 'KittyPaw Collar', // Tipo predeterminado
            status: 'offline',       // Estado inicial
            batteryLevel: 100,       // Nivel de batería inicial
            ipAddress: null          // Sin dirección IP inicial
          });
          
          console.log("Nuevo dispositivo creado para actualización:", newDevice);
          
          // Suscribirnos al tópico del nuevo dispositivo
          mqttClient.addTopic(deviceId);
          log(`Auto-subscribing to new device topic: ${deviceId}`, 'express');
        }
      }
      
      // Crear un objeto con fechas procesadas adecuadamente
      const petToUpdate = {
        ...petData,
        // Solo procesar las fechas que estén presentes en los datos
        ...(petData.acquisitionDate && { acquisitionDate: processDate(petData.acquisitionDate) }),
        ...(petData.birthDate && { birthDate: processDate(petData.birthDate) }),
        ...(petData.lastVetVisit && { lastVetVisit: processDate(petData.lastVetVisit) }),
        // Procesar booleanos solo si están presentes
        ...(petData.hasVaccinations !== undefined && { 
          hasVaccinations: petData.hasVaccinations === true || petData.hasVaccinations === 'true'
        }),
        ...(petData.hasDiseases !== undefined && { 
          hasDiseases: petData.hasDiseases === true || petData.hasDiseases === 'true'
        }),
        // Asegurarnos de que el ID del propietario sea un número si está presente
        ...(petData.ownerId && { 
          ownerId: typeof petData.ownerId === 'string' ? parseInt(petData.ownerId) : petData.ownerId
        }),
        // Asegurar que kittyPawDeviceId sea null si no se proporciona
        ...(petData.kittyPawDeviceId !== undefined && { 
          kittyPawDeviceId: petData.kittyPawDeviceId || null 
        })
      };
      
      console.log("Datos de mascota procesados para actualización:", petToUpdate);
      const updatedPet = await storage.updatePet(id, petToUpdate);
      res.json(updatedPet);
    } catch (error) {
      console.error('Error updating pet:', error);
      
      // Proporcionar un mensaje de error más descriptivo
      let errorMessage = 'Error al actualizar la mascota';
      
      // Intentar extraer detalles útiles del error para el cliente
      if (error instanceof Error) {
        // Verificar si es un error de PostgreSQL con detalles
        const pgError = error as any;
        if (pgError.detail) {
          // Proporcionar un mensaje más amigable basado en el error específico
          if (pgError.code === '23503' && pgError.constraint === 'pets_kitty_paw_device_id_fkey') {
            errorMessage = `El dispositivo especificado no existe. Por favor, crea primero el dispositivo o deja el campo en blanco.`;
          } 
          else if (pgError.code === '23503' && pgError.constraint === 'pets_owner_id_fkey') {
            errorMessage = `El propietario especificado no existe. Por favor, selecciona un propietario válido.`;
          }
          else if (pgError.code === '23505') {
            errorMessage = `Ya existe una mascota con ese número de chip. Por favor, usa un número de chip único.`;
          }
        }
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  app.delete('/api/pets/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Obtener la mascota antes de eliminarla para verificar permisos
      const pet = await storage.getPet(id);
      if (!pet) {
        return res.status(404).json({ message: 'Mascota no encontrada' });
      }
      
      // Verificar si el usuario tiene privilegios de administrador
      const isAdmin = userRole === 'admin';
      
      // Si no es admin, verificar que la mascota pertenezca al usuario
      if (!isAdmin && userId !== pet.ownerId) {
        return res.status(403).json({ 
          message: 'No tienes permiso para eliminar esta mascota' 
        });
      }
      
      // Eliminar la mascota
      const result = await storage.deletePet(id);
      
      if (!result) {
        return res.status(404).json({ message: 'Error al eliminar la mascota' });
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
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const userRole = req.query.role as string;
      
      // Verificar si el dispositivo está en la lista de dispositivos permitidos para el usuario
      // si no es admin
      if (userRole !== 'admin' && userId) {
        const userDevices = await filterDevicesByUserPets(userId);
        const deviceAllowed = userDevices.some(device => device.deviceId === deviceId);
        
        if (!deviceAllowed) {
          return res.status(403).json({ 
            message: 'No tienes permiso para ver información sobre este dispositivo' 
          });
        }
      }
      
      // Obtener la mascota por ID de dispositivo
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

/**
 * Filtra dispositivos basándose en las mascotas asociadas a un usuario específico
 */
async function filterDevicesByUserPets(userId: number) {
  // Obtener las mascotas del usuario
  const ownerPets = await storage.getPetsByOwnerId(userId);
  
  // Obtener todos los dispositivos
  const allDevices = await storage.getDevices();
  
  // Extraer los IDs de los dispositivos asociados a las mascotas
  const petDeviceIds = ownerPets
    .filter(pet => pet.kittyPawDeviceId)
    .map(pet => pet.kittyPawDeviceId);
  
  // Filtrar los dispositivos que corresponden a las mascotas del usuario
  return allDevices.filter(device => 
    petDeviceIds.includes(device.deviceId)
  );
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
