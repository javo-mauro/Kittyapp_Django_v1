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
import { eq, desc, sql, and, isNull } from 'drizzle-orm';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;

  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDeviceStatus(deviceId: string, status: string): Promise<void>;
  updateDeviceBattery(deviceId: string, batteryLevel: number): Promise<void>;

  // Sensor data operations
  getSensorData(deviceId: string, limit?: number): Promise<SensorData[]>;
  getSensorDataByType(deviceId: string, sensorType: string, limit?: number): Promise<SensorData[]>;
  createSensorData(data: InsertSensorData): Promise<SensorData>;
  getLatestReadings(): Promise<SensorReading[]>;

  // MQTT connection operations
  getMqttConnection(id: number): Promise<MqttConnection | undefined>;
  getMqttConnectionByUserId(userId: number): Promise<MqttConnection | undefined>;
  createMqttConnection(connection: InsertMqttConnection): Promise<MqttConnection>;
  updateMqttConnectionStatus(id: number, connected: boolean): Promise<void>;

  // System operations
  getSystemMetrics(): Promise<SystemMetrics>;
  
  // Pet owner operations
  getPetOwners(): Promise<PetOwner[]>;
  getPetOwner(id: number): Promise<PetOwner | undefined>;
  getPetOwnerByEmail(email: string): Promise<PetOwner | undefined>;
  getPetOwnerByUsername(username: string): Promise<PetOwner | undefined>;
  createPetOwner(owner: InsertPetOwner): Promise<PetOwner>;
  updatePetOwner(id: number, owner: Partial<InsertPetOwner>): Promise<PetOwner>;
  deletePetOwner(id: number): Promise<boolean>;
  
  // Pet operations
  getPets(): Promise<Pet[]>;
  getPetsByOwnerId(ownerId: number): Promise<Pet[]>;
  getPet(id: number): Promise<Pet | undefined>;
  getPetByChipNumber(chipNumber: string): Promise<Pet | undefined>;
  createPet(pet: InsertPet): Promise<Pet>;
  updatePet(id: number, pet: Partial<InsertPet>): Promise<Pet>;
  deletePet(id: number): Promise<boolean>;
  getPetByKittyPawDeviceId(deviceId: string): Promise<Pet | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private sensorData: SensorData[];
  private mqttConnections: Map<number, MqttConnection>;
  private petOwners: Map<number, PetOwner>;
  private pets: Map<number, Pet>;
  currentUserId: number;
  currentDeviceId: number;
  currentSensorDataId: number;
  currentMqttConnectionId: number;
  currentPetOwnerId: number;
  currentPetId: number;

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.sensorData = [];
    this.mqttConnections = new Map();
    this.petOwners = new Map();
    this.pets = new Map();
    this.currentUserId = 1;
    this.currentDeviceId = 1;
    this.currentSensorDataId = 1;
    this.currentMqttConnectionId = 1;
    this.currentPetOwnerId = 1;
    this.currentPetId = 1;

    // Establecer a Javier Dayne como administrador
    this.createUser({
      username: "admin",
      password: "admin123",
      name: "Javier Dayne",
      role: "Administrator"
    });

    // Solo mantenemos el dispositivo KPCL0021 asociado a la mascota de Javier

    // Agregar un propietario de mascota por defecto
    const petOwner = this.createPetOwner({
      name: "Javier",
      paternalLastName: "Dayne",
      maternalLastName: "González",
      address: "Calle Principal 123, Ciudad",
      birthDate: new Date("1985-06-15"),
      email: "javier.dayne@example.com",
      username: "jdayne",
      password: "jdayne21"
    });

    // Agregar una mascota por defecto
    this.createPet({
      ownerId: 1,
      name: "Malto",
      chipNumber: "CHIP123456",
      breed: "Labrador",
      species: "Perro",
      acquisitionDate: new Date("2021-03-10"),
      birthDate: new Date("2020-09-05"),
      origin: "Adoptado",
      background: "Rescatado de la calle",
      hasVaccinations: true,
      hasDiseases: false,
      diseaseNotes: null,
      lastVetVisit: new Date("2023-01-15"),
      kittyPawDeviceId: "KPCL0021"
    });

    // Create a default MQTT connection
    this.createMqttConnection({
      userId: 1,
      brokerUrl: "mqtt://a2fvfjwoybq3qw-ats.iot.us-east-2.amazonaws.com",
      clientId: "kitty-paw-monitor",
      username: "mqtt-user",
      password: "mqtt-password"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      lastLogin: now,
      name: insertUser.name || null,
      role: insertUser.role || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      this.users.set(id, user);
    }
  }

  // Device operations
  async getDevices(): Promise<Device[]> {
    // Obtener todos los dispositivos
    const allDevices = Array.from(this.devices.values());
    
    // Crear un mapa para rastrear dispositivos únicos por deviceId
    const uniqueDevicesMap = new Map<string, Device>();
    
    // Para cada dispositivo, si ya existe uno con el mismo deviceId, mantener solo el más reciente
    for (const device of allDevices) {
      const existingDevice = uniqueDevicesMap.get(device.deviceId);
      
      // Si no existe un dispositivo con este deviceId o el actual es más reciente, guardarlo
      if (!existingDevice || 
          (device.lastUpdate && existingDevice.lastUpdate && 
           device.lastUpdate > existingDevice.lastUpdate)) {
        uniqueDevicesMap.set(device.deviceId, device);
      }
    }
    
    // Convertir el mapa a un array de dispositivos
    return Array.from(uniqueDevicesMap.values());
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    // Obtener todos los dispositivos con este deviceId
    const matchingDevices = Array.from(this.devices.values())
      .filter((device) => device.deviceId === deviceId);
    
    if (matchingDevices.length === 0) {
      return undefined;
    }
    
    // Si hay varios dispositivos con el mismo deviceId, retornar el más reciente
    return matchingDevices.sort((a, b) => {
      if (!a.lastUpdate) return 1;
      if (!b.lastUpdate) return -1;
      return b.lastUpdate.getTime() - a.lastUpdate.getTime();
    })[0];
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const id = this.currentDeviceId++;
    const now = new Date();
    const device: Device = { 
      ...insertDevice, 
      id, 
      lastUpdate: now,
      status: insertDevice.status || null,
      ipAddress: insertDevice.ipAddress || null,
      batteryLevel: insertDevice.batteryLevel || null
    };
    this.devices.set(id, device);
    return device;
  }

  async updateDeviceStatus(deviceId: string, status: string): Promise<void> {
    const device = await this.getDeviceByDeviceId(deviceId);
    if (device) {
      console.log(`Updating device ${deviceId} status from ${device.status} to ${status}`);
      device.status = status;
      device.lastUpdate = new Date();
      this.devices.set(device.id, device);
    }
  }

  async updateDeviceBattery(deviceId: string, batteryLevel: number): Promise<void> {
    const device = await this.getDeviceByDeviceId(deviceId);
    if (device) {
      device.batteryLevel = batteryLevel;
      device.lastUpdate = new Date();
      this.devices.set(device.id, device);
    }
  }

  // Sensor data operations
  async getSensorData(deviceId: string, limit = 100): Promise<SensorData[]> {
    return this.sensorData
      .filter(data => data.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getSensorDataByType(deviceId: string, sensorType: string, limit = 100): Promise<SensorData[]> {
    return this.sensorData
      .filter(data => data.deviceId === deviceId && data.sensorType === sensorType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createSensorData(insertData: InsertSensorData): Promise<SensorData> {
    const id = this.currentSensorDataId++;
    const now = new Date();
    const data: SensorData = { ...insertData, id, timestamp: now };
    this.sensorData.push(data);
    
    // No actualizamos automáticamente el estado a "online" ya que esto puede anular
    // los cambios de estado explícitos que se envían en los mensajes MQTT
    // Sólo actualizamos el timestamp
    const device = await this.getDeviceByDeviceId(insertData.deviceId);
    if (device) {
      device.lastUpdate = now;
      this.devices.set(device.id, device);
    }
    
    return data;
  }

  async getLatestReadings(): Promise<SensorReading[]> {
    const devices = await this.getDevices();
    const readings: SensorReading[] = [];
    
    for (const device of devices) {
      const deviceData = this.sensorData
        .filter(data => data.deviceId === device.deviceId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Group by sensor type to get the latest reading for each type
      const sensorTypes = Array.from(new Set(deviceData.map(data => data.sensorType)));
      
      for (const type of sensorTypes) {
        const latestData = deviceData.find(data => data.sensorType === type);
        if (latestData) {
          const data = latestData.data as any;
          readings.push({
            deviceId: device.deviceId,
            sensorType: type,
            value: data.value,
            unit: data.unit,
            timestamp: latestData.timestamp.toISOString()
          });
        }
      }
    }
    
    return readings;
  }

  // MQTT connection operations
  async getMqttConnection(id: number): Promise<MqttConnection | undefined> {
    return this.mqttConnections.get(id);
  }

  async getMqttConnectionByUserId(userId: number): Promise<MqttConnection | undefined> {
    return Array.from(this.mqttConnections.values()).find(
      (conn) => conn.userId === userId,
    );
  }

  async createMqttConnection(insertConnection: InsertMqttConnection): Promise<MqttConnection> {
    const id = this.currentMqttConnectionId++;
    const now = new Date();
    const connection: MqttConnection = { 
      ...insertConnection, 
      id, 
      connected: false,
      lastConnected: now,
      username: insertConnection.username || null,
      password: insertConnection.password || null,
      userId: insertConnection.userId || null,
      caCert: insertConnection.caCert || null,
      clientCert: insertConnection.clientCert || null,
      privateKey: insertConnection.privateKey || null
    };
    this.mqttConnections.set(id, connection);
    return connection;
  }

  async updateMqttConnectionStatus(id: number, connected: boolean): Promise<void> {
    const connection = this.mqttConnections.get(id);
    if (connection) {
      connection.connected = connected;
      if (connected) {
        connection.lastConnected = new Date();
      }
      this.mqttConnections.set(id, connection);
    }
  }

  // System operations
  async getSystemMetrics(): Promise<SystemMetrics> {
    const devices = await this.getDevices();
    const activeDevices = devices.filter(device => device.status === "online").length;
    
    // Count unique sensor types across all devices
    const sensorTypeKeys = this.sensorData.map(data => `${data.deviceId}-${data.sensorType}`);
    const uniqueSensorTypes = Array.from(new Set(sensorTypeKeys));
    
    // Count alerts (devices with warning status)
    const alerts = devices.filter(device => device.status === "warning").length;
    
    // Find the latest update time
    let lastUpdate = new Date(0);
    for (const device of devices) {
      if (device.lastUpdate && device.lastUpdate > lastUpdate) {
        lastUpdate = device.lastUpdate;
      }
    }
    
    return {
      activeDevices,
      activeSensors: uniqueSensorTypes.length,
      alerts,
      lastUpdate: lastUpdate.toISOString()
    };
  }

  // Pet owner operations
  async getPetOwners(): Promise<PetOwner[]> {
    return Array.from(this.petOwners.values());
  }

  async getPetOwner(id: number): Promise<PetOwner | undefined> {
    return this.petOwners.get(id);
  }

  async getPetOwnerByEmail(email: string): Promise<PetOwner | undefined> {
    return Array.from(this.petOwners.values()).find(
      (owner) => owner.email === email
    );
  }

  async getPetOwnerByUsername(username: string): Promise<PetOwner | undefined> {
    return Array.from(this.petOwners.values()).find(
      (owner) => owner.username === username
    );
  }

  async createPetOwner(owner: InsertPetOwner): Promise<PetOwner> {
    const id = this.currentPetOwnerId++;
    console.log(`Creando nuevo dueño con ID: ${id}, currentPetOwnerId: ${this.currentPetOwnerId}`);
    const now = new Date();
    const petOwner: PetOwner = {
      ...owner,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.petOwners.set(id, petOwner);
    console.log(`Dueño creado:`, petOwner);
    return petOwner;
  }

  async updatePetOwner(id: number, owner: Partial<InsertPetOwner>): Promise<PetOwner> {
    const existingOwner = this.petOwners.get(id);
    if (!existingOwner) {
      throw new Error(`Pet owner with ID ${id} not found`);
    }

    const updatedOwner: PetOwner = {
      ...existingOwner,
      ...owner,
      id,
      updatedAt: new Date()
    };
    this.petOwners.set(id, updatedOwner);
    return updatedOwner;
  }

  async deletePetOwner(id: number): Promise<boolean> {
    // Primero eliminar todas las mascotas asociadas a este dueño
    const ownerPets = await this.getPetsByOwnerId(id);
    for (const pet of ownerPets) {
      await this.deletePet(pet.id);
    }
    return this.petOwners.delete(id);
  }

  // Pet operations
  async getPets(): Promise<Pet[]> {
    return Array.from(this.pets.values());
  }

  async getPetsByOwnerId(ownerId: number): Promise<Pet[]> {
    return Array.from(this.pets.values()).filter(
      (pet) => pet.ownerId === ownerId
    );
  }

  async getPet(id: number): Promise<Pet | undefined> {
    return this.pets.get(id);
  }

  async getPetByChipNumber(chipNumber: string): Promise<Pet | undefined> {
    return Array.from(this.pets.values()).find(
      (pet) => pet.chipNumber === chipNumber
    );
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const id = this.currentPetId++;
    console.log(`Creando nueva mascota con ID: ${id}, currentPetId: ${this.currentPetId}, ownerId: ${pet.ownerId}`);
    const now = new Date();
    const newPet: Pet = {
      ...pet,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.pets.set(id, newPet);
    console.log(`Mascota creada:`, newPet);
    return newPet;
  }

  async updatePet(id: number, pet: Partial<InsertPet>): Promise<Pet> {
    const existingPet = this.pets.get(id);
    if (!existingPet) {
      throw new Error(`Pet with ID ${id} not found`);
    }

    const updatedPet: Pet = {
      ...existingPet,
      ...pet,
      id,
      updatedAt: new Date()
    };
    this.pets.set(id, updatedPet);
    return updatedPet;
  }

  async deletePet(id: number): Promise<boolean> {
    return this.pets.delete(id);
  }

  async getPetByKittyPawDeviceId(deviceId: string): Promise<Pet | undefined> {
    return Array.from(this.pets.values()).find(
      (pet) => pet.kittyPawDeviceId === deviceId
    );
  }
}

import { DatabaseStorage } from './database-storage';

// Exportamos la implementación de base de datos PostgreSQL
export const storage = new DatabaseStorage();
