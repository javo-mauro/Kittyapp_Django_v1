import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: text("role").default("user"),
  lastLogin: timestamp("last_login"),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  ipAddress: text("ip_address"),
  status: text("status").default("offline"),
  batteryLevel: integer("battery_level"),
  lastUpdate: timestamp("last_update"),
});

export const sensorData = pgTable("sensor_data", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: jsonb("data").notNull(),
  sensorType: text("sensor_type").notNull(),
});

export const mqttConnections = pgTable("mqtt_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  brokerUrl: text("broker_url").notNull(),
  clientId: text("client_id").notNull(),
  username: text("username"),
  password: text("password"),
  caCert: text("ca_cert"),
  clientCert: text("client_cert"),
  privateKey: text("private_key"),
  connected: boolean("connected").default(false),
  lastConnected: timestamp("last_connected"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastUpdate: true,
});

export const insertSensorDataSchema = createInsertSchema(sensorData).omit({
  id: true,
  timestamp: true,
});

export const insertMqttConnectionSchema = createInsertSchema(mqttConnections).omit({
  id: true,
  connected: true,
  lastConnected: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertSensorData = z.infer<typeof insertSensorDataSchema>;
export type SensorData = typeof sensorData.$inferSelect;

export type InsertMqttConnection = z.infer<typeof insertMqttConnectionSchema>;
export type MqttConnection = typeof mqttConnections.$inferSelect;

// Custom types for sensor data
export type TemperatureData = {
  value: number;
  unit: string;
  timestamp: string;
};

export type HumidityData = {
  value: number;
  unit: string;
  timestamp: string;
};

export type LightData = {
  value: number;
  unit: string;
  timestamp: string;
};

export type MotionData = {
  detected: boolean;
  timestamp: string;
};

export type SensorReading = {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: string;
};

export type SystemMetrics = {
  activeDevices: number;
  activeSensors: number;
  alerts: number;
  lastUpdate: string;
};

export type SystemInfo = {
  version: string;
  mqttVersion: string;
  lastUpdate: string;
};
