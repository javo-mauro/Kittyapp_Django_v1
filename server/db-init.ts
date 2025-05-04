import { db } from './db';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Inicializa la base de datos creando todas las tablas necesarias
 */
export async function initializeDatabase() {
  console.log('Inicializando la base de datos...');
  
  try {
    // Verificar si la tabla de usuarios existe
    const tableExists = await checkIfTableExists('users');
    
    if (!tableExists) {
      console.log('Creando tablas en la base de datos...');
      
      // Crear tablas en el orden correcto para respetar las relaciones
      await createTable('users', `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user',
          last_login TIMESTAMP
        )
      `);
      
      await createTable('devices', `
        CREATE TABLE IF NOT EXISTS devices (
          id SERIAL PRIMARY KEY,
          device_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          ip_address TEXT,
          status TEXT DEFAULT 'offline',
          battery_level INTEGER,
          last_update TIMESTAMP
        )
      `);
      
      await createTable('sensor_data', `
        CREATE TABLE IF NOT EXISTS sensor_data (
          id SERIAL PRIMARY KEY,
          device_id TEXT NOT NULL REFERENCES devices(device_id),
          timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
          data JSONB NOT NULL,
          sensor_type TEXT NOT NULL
        )
      `);
      
      await createTable('mqtt_connections', `
        CREATE TABLE IF NOT EXISTS mqtt_connections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          broker_url TEXT NOT NULL,
          client_id TEXT NOT NULL,
          username TEXT,
          password TEXT,
          ca_cert TEXT,
          client_cert TEXT,
          private_key TEXT,
          connected BOOLEAN DEFAULT false,
          last_connected TIMESTAMP
        )
      `);
      
      await createTable('pet_owners', `
        CREATE TABLE IF NOT EXISTS pet_owners (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          paternal_last_name TEXT NOT NULL,
          maternal_last_name TEXT,
          address TEXT NOT NULL,
          birth_date TIMESTAMP NOT NULL,
          email TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      
      await createTable('pets', `
        CREATE TABLE IF NOT EXISTS pets (
          id SERIAL PRIMARY KEY,
          owner_id INTEGER NOT NULL REFERENCES pet_owners(id),
          name TEXT NOT NULL,
          chip_number TEXT NOT NULL UNIQUE,
          breed TEXT NOT NULL,
          species TEXT NOT NULL,
          acquisition_date TIMESTAMP NOT NULL,
          birth_date TIMESTAMP,
          origin TEXT NOT NULL,
          background TEXT,
          has_vaccinations BOOLEAN NOT NULL,
          has_diseases BOOLEAN NOT NULL,
          disease_notes TEXT,
          last_vet_visit TIMESTAMP,
          kitty_paw_device_id TEXT REFERENCES devices(device_id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      
      console.log('Tablas creadas exitosamente');
      
      // Insertar datos iniciales
      console.log('Insertando datos iniciales...');
      await insertInitialData();
      
      console.log('Base de datos inicializada correctamente');
    } else {
      console.log('Base de datos ya inicializada');
    }
    
    return true;
  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
    return false;
  }
}

/**
 * Verifica si una tabla específica existe en la base de datos
 */
async function checkIfTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = ${tableName}
      )
    `);
    
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error(`Error verificando si la tabla ${tableName} existe:`, error);
    return false;
  }
}

/**
 * Crea una tabla en la base de datos
 */
async function createTable(tableName: string, createTableSQL: string): Promise<void> {
  try {
    console.log(`Creando tabla ${tableName}...`);
    await db.execute(sql.raw(createTableSQL));
    console.log(`Tabla ${tableName} creada`);
  } catch (error) {
    console.error(`Error creando tabla ${tableName}:`, error);
    throw error;
  }
}

/**
 * Inserta datos iniciales en la base de datos
 */
async function insertInitialData(): Promise<void> {
  try {
    // Insertar usuario admin
    const adminExists = await db.select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(sql`username = 'admin'`);
    
    let adminId = 0;
    
    if (!adminExists[0] || Number(adminExists[0]?.count) === 0) {
      const [admin] = await db.insert(schema.users).values({
        username: "admin",
        password: "admin123",
        name: "Javier Dayne",
        role: "Administrator"
      }).returning();
      
      adminId = admin.id;
      console.log('Usuario admin creado');
    } else {
      // Obtener el ID del admin
      const [admin] = await db.select().from(schema.users).where(sql`username = 'admin'`);
      adminId = admin?.id || 0;
      console.log('Usuario admin encontrado con ID:', adminId);
    }
    
    // Insertar dueño de mascota Javier Dayne
    const jdayneExists = await db.select({ count: sql<number>`count(*)` })
      .from(schema.petOwners)
      .where(sql`username = 'jdayne'`);
    
    let ownerId: number | undefined;
    
    if (!jdayneExists[0] || Number(jdayneExists[0]?.count) === 0) {
      const [owner] = await db.insert(schema.petOwners).values({
        name: "Javier",
        paternalLastName: "Dayne",
        maternalLastName: "González",
        address: "Calle Principal 123, Ciudad",
        birthDate: new Date("1985-06-15"),
        email: "javier.dayne@example.com",
        username: "jdayne",
        password: "jdayne21"
      }).returning();
      
      ownerId = owner.id;
      console.log('Dueño Javier Dayne creado');
    } else {
      const [owner] = await db.select().from(schema.petOwners).where(sql`username = 'jdayne'`);
      ownerId = owner?.id;
    }
    
    // Crear dispositivos
    const device1Exists = await db.select({ count: sql<number>`count(*)` })
      .from(schema.devices)
      .where(sql`device_id = 'KPCL0021'`);
    
    if (!device1Exists[0] || Number(device1Exists[0]?.count) === 0) {
      await db.insert(schema.devices).values({
        deviceId: "KPCL0021",
        name: "Collar de Malto",
        type: "KittyPaw Collar",
        status: "offline",
        batteryLevel: 95
      });
      console.log('Dispositivo KPCL0021 creado');
    }
    
    const device2Exists = await db.select({ count: sql<number>`count(*)` })
      .from(schema.devices)
      .where(sql`device_id = 'KPCL0022'`);
    
    if (!device2Exists[0] || Number(device2Exists[0]?.count) === 0) {
      await db.insert(schema.devices).values({
        deviceId: "KPCL0022",
        name: "Placa de Canela",
        type: "KittyPaw Tracker",
        status: "offline",
        batteryLevel: 85
      });
      console.log('Dispositivo KPCL0022 creado');
    }
    
    // Crear mascota asociada con KPCL0021
    if (ownerId) {
      const petExists = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pets)
        .where(sql`chip_number = 'CHIP123456'`);
      
      if (!petExists[0] || Number(petExists[0]?.count) === 0) {
        await db.insert(schema.pets).values({
          ownerId,
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
        console.log('Mascota Malto creada');
      }
    }
    
    // Crear conexión MQTT por defecto
    const mqttExists = await db.select({ count: sql<number>`count(*)` })
      .from(schema.mqttConnections)
      .where(sql`broker_url = 'mqtt://broker.emqx.io:1883'`);
    
    if ((!mqttExists[0] || Number(mqttExists[0]?.count) === 0) && adminId > 0) {
      await db.insert(schema.mqttConnections).values({
        userId: adminId,
        brokerUrl: "mqtt://broker.emqx.io:1883",
        clientId: `kitty-paw-${Math.random().toString(16).substring(2, 10)}`,
        username: null,
        password: null
      });
      console.log('Conexión MQTT creada');
    }
    
  } catch (error) {
    console.error('Error insertando datos iniciales:', error);
    throw error;
  }
}