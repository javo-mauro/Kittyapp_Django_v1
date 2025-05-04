import {
  users,
  devices,
  sensorData,
  mqttConnections,
  petOwners,
  pets,
  type User,
  type InsertUser,
  type Device,
  type InsertDevice,
  type SensorData,
  type InsertSensorData,
  type MqttConnection,
  type InsertMqttConnection,
  type SensorReading,
  type SystemMetrics,
  type PetOwner,
  type InsertPetOwner,
  type Pet,
  type InsertPet
} from "@shared/schema";
import { db } from './db';
import { eq, desc, sql, and, isNull, asc } from 'drizzle-orm';
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  // Device operations
  async getDevices(): Promise<Device[]> {
    return db.select().from(devices).orderBy(asc(devices.id));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.deviceId, deviceId));
    return device;
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices)
      .values({
        ...device,
        lastUpdate: new Date()
      })
      .returning();
    return newDevice;
  }

  async updateDeviceStatus(deviceId: string, status: string): Promise<void> {
    await db.update(devices)
      .set({ 
        status,
        lastUpdate: new Date()
      })
      .where(eq(devices.deviceId, deviceId));
  }

  async updateDeviceBattery(deviceId: string, batteryLevel: number): Promise<void> {
    await db.update(devices)
      .set({ 
        batteryLevel,
        lastUpdate: new Date()
      })
      .where(eq(devices.deviceId, deviceId));
  }

  // Sensor data operations
  async getSensorData(deviceId: string, limit = 100): Promise<SensorData[]> {
    return db.select()
      .from(sensorData)
      .where(eq(sensorData.deviceId, deviceId))
      .orderBy(desc(sensorData.timestamp))
      .limit(limit);
  }

  async getSensorDataByType(deviceId: string, sensorType: string, limit = 100): Promise<SensorData[]> {
    return db.select()
      .from(sensorData)
      .where(and(
        eq(sensorData.deviceId, deviceId),
        eq(sensorData.sensorType, sensorType)
      ))
      .orderBy(desc(sensorData.timestamp))
      .limit(limit);
  }

  async createSensorData(data: InsertSensorData): Promise<SensorData> {
    const [newData] = await db.insert(sensorData)
      .values({
        ...data,
        timestamp: new Date()
      })
      .returning();
    return newData;
  }

  async getLatestReadings(): Promise<SensorReading[]> {
    // Esta es una consulta más compleja que necesita una subconsulta
    const latestReadingsQuery = `
      WITH latest AS (
        SELECT DISTINCT ON (device_id, sensor_type)
          device_id,
          sensor_type,
          data,
          timestamp
        FROM sensor_data
        ORDER BY device_id, sensor_type, timestamp DESC
      )
      SELECT 
        l.device_id as "deviceId",
        l.sensor_type as "sensorType",
        (l.data ->> 'value')::numeric as "value",
        l.data ->> 'unit' as "unit",
        l.timestamp as "timestamp"
      FROM latest l
      ORDER BY l.device_id, l.sensor_type
    `;
    
    const result = await db.execute(sql.raw(latestReadingsQuery));
    return result.rows as SensorReading[];
  }

  // MQTT connection operations
  async getMqttConnection(id: number): Promise<MqttConnection | undefined> {
    const [connection] = await db.select().from(mqttConnections).where(eq(mqttConnections.id, id));
    return connection;
  }

  async getMqttConnectionByUserId(userId: number): Promise<MqttConnection | undefined> {
    const [connection] = await db.select()
      .from(mqttConnections)
      .where(eq(mqttConnections.userId, userId));
    return connection;
  }

  async createMqttConnection(connection: InsertMqttConnection): Promise<MqttConnection> {
    const [newConnection] = await db.insert(mqttConnections)
      .values({
        ...connection,
        connected: false,
        lastConnected: new Date()
      })
      .returning();
    return newConnection;
  }

  async updateMqttConnectionStatus(id: number, connected: boolean): Promise<void> {
    await db.update(mqttConnections)
      .set({ 
        connected,
        lastConnected: connected ? new Date() : undefined
      })
      .where(eq(mqttConnections.id, id));
  }

  // System operations
  async getSystemMetrics(): Promise<SystemMetrics> {
    // Contar dispositivos activos (con estado "online")
    const activeDevicesResult = await db.select({
      count: sql<number>`count(*)`,
    })
    .from(devices)
    .where(eq(devices.status, 'online'));
    
    // Contar sensores activos (distintos sensores en los últimos 15 minutos)
    const activeSensorsQuery = `
      SELECT COUNT(DISTINCT sensor_type) as count
      FROM sensor_data
      WHERE timestamp > NOW() - INTERVAL '15 minutes'
    `;
    const activeSensorsResult = await db.execute(sql.raw(activeSensorsQuery));
    
    // Contar alertas (por implementar, por ahora devuelve 0)
    const alertsCount = 0;
    
    return {
      activeDevices: activeDevicesResult[0]?.count || 0,
      activeSensors: parseInt(activeSensorsResult.rows[0]?.count || '0'),
      alerts: alertsCount,
      lastUpdate: new Date().toISOString()
    };
  }
  
  // Pet owner operations
  async getPetOwners(): Promise<PetOwner[]> {
    return db.select().from(petOwners);
  }
  
  async getPetOwner(id: number): Promise<PetOwner | undefined> {
    const [owner] = await db.select().from(petOwners).where(eq(petOwners.id, id));
    return owner;
  }
  
  async getPetOwnerByEmail(email: string): Promise<PetOwner | undefined> {
    const [owner] = await db.select().from(petOwners).where(eq(petOwners.email, email));
    return owner;
  }
  
  async getPetOwnerByUsername(username: string): Promise<PetOwner | undefined> {
    const [owner] = await db.select().from(petOwners).where(eq(petOwners.username, username));
    return owner;
  }
  
  async createPetOwner(owner: InsertPetOwner): Promise<PetOwner> {
    const now = new Date();
    const [newOwner] = await db.insert(petOwners)
      .values({
        ...owner,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newOwner;
  }
  
  async updatePetOwner(id: number, owner: Partial<InsertPetOwner>): Promise<PetOwner> {
    const [updatedOwner] = await db.update(petOwners)
      .set({
        ...owner,
        updatedAt: new Date()
      })
      .where(eq(petOwners.id, id))
      .returning();
    return updatedOwner;
  }
  
  async deletePetOwner(id: number): Promise<boolean> {
    const result = await db.delete(petOwners)
      .where(eq(petOwners.id, id))
      .returning({ id: petOwners.id });
    return result.length > 0;
  }
  
  // Pet operations
  async getPets(): Promise<Pet[]> {
    return db.select().from(pets);
  }
  
  async getPetsByOwnerId(ownerId: number): Promise<Pet[]> {
    return db.select()
      .from(pets)
      .where(eq(pets.ownerId, ownerId));
  }
  
  async getPet(id: number): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, id));
    return pet;
  }
  
  async getPetByChipNumber(chipNumber: string): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.chipNumber, chipNumber));
    return pet;
  }
  
  async createPet(pet: InsertPet): Promise<Pet> {
    const now = new Date();
    const [newPet] = await db.insert(pets)
      .values({
        ...pet,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return newPet;
  }
  
  async updatePet(id: number, pet: Partial<InsertPet>): Promise<Pet> {
    const [updatedPet] = await db.update(pets)
      .set({
        ...pet,
        updatedAt: new Date()
      })
      .where(eq(pets.id, id))
      .returning();
    return updatedPet;
  }
  
  async deletePet(id: number): Promise<boolean> {
    const result = await db.delete(pets)
      .where(eq(pets.id, id))
      .returning({ id: pets.id });
    return result.length > 0;
  }
  
  async getPetByKittyPawDeviceId(deviceId: string): Promise<Pet | undefined> {
    const [pet] = await db.select()
      .from(pets)
      .where(eq(pets.kittyPawDeviceId, deviceId));
    return pet;
  }
}