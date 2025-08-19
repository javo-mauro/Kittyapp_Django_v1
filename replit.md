# KittyPaw Sensors - IoT Pet Monitoring System

## Overview

This is a hybrid full-stack IoT application for monitoring pet sensors through MQTT communication. The system combines Django backend services with a modern React frontend, utilizing both PostgreSQL and real-time MQTT data streaming. The application monitors pet health metrics through IoT devices attached to collars and feeding plates.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application uses a dual-stack architecture combining:

1. **Django Backend**: Handles user management, device registration, and traditional web views
2. **Node.js/Express API**: Manages real-time data processing, WebSocket connections, and MQTT broker communication
3. **React Frontend**: Provides a modern SPA interface with real-time dashboard capabilities
4. **PostgreSQL Database**: Stores user data, device information, and sensor readings
5. **MQTT Integration**: Real-time communication with IoT devices

The system supports two main deployment modes:
- Development: Django server on port 5000, Node.js on configurable port
- Production: Unified deployment through the Node.js server

## Key Components

### Backend Services

**Django Application (`kittypaw_app/`)**
- User authentication and authorization with custom User model
- Device and pet management through Django ORM
- Admin interface for system administration
- WebSocket consumers for real-time data
- MQTT client integration for IoT communication

**Node.js API Server (`server/`)**
- Express.js REST API endpoints
- WebSocket server for real-time frontend communication
- MQTT broker client for device data ingestion
- Drizzle ORM for database operations
- Real-time data processing and storage

### Frontend Application (`client/`)
- React 18 with TypeScript
- Vite build system and development server
- Tailwind CSS with shadcn/ui components
- React Query for state management and API caching
- Real-time WebSocket integration
- Responsive design with mobile navigation

### Database Schema

The system uses PostgreSQL with the following main entities:
- **Users**: Authentication and role-based access (admin/user)
- **Devices**: IoT device registration and status tracking
- **SensorData**: Time-series sensor readings (temperature, humidity, light, weight)
- **PetOwners**: Pet owner information and contact details
- **Pets**: Pet profiles linked to devices
- **MqttConnections**: MQTT broker configuration and status

## Data Flow

1. **IoT Devices** → MQTT Broker → **Node.js MQTT Client**
2. **MQTT Data** → **PostgreSQL** (via Drizzle ORM)
3. **Database** → **WebSocket** → **React Frontend**
4. **User Actions** → **REST API** → **Database**
5. **Django Admin** → **Django ORM** → **PostgreSQL**

### MQTT Data Format
```json
{
  "device_id": "KPCL0021",
  "timestamp": "2024-01-01T12:00:00Z",
  "humidity": 65.5,
  "temperature": 22.3,
  "light": 850.0,
  "weight": 4.2
}
```

## External Dependencies

### MQTT Broker
- **AWS IoT Core**: Primary broker for production
- **Public Brokers**: Fallback options for development
- **Topics**: Device-specific (e.g., `KPCL0021/pub`)

### Database
- **PostgreSQL**: Primary data store
- **Neon Database**: Cloud PostgreSQL provider (configured via `DATABASE_URL`)

### Authentication
- **Session-based**: Django sessions for web interface
- **JWT/Cookie**: API authentication for frontend

### Real-time Communication
- **WebSockets**: Client-server real-time data
- **MQTT**: Device-server communication

## Deployment Strategy

The application supports flexible deployment through multiple entry points:

### Development Mode
```bash
# Django development server
python run_django_server.py

# Node.js development server
npm run dev
```

### Production Mode
```bash
# Unified Node.js server (serves static React build + API)
npm run build
npm start
```

### Database Migration
- **Drizzle Kit**: Schema management and migrations
- **Django Migrations**: Legacy model management
- **Initial Setup**: Automated superuser creation script

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Development/production mode
- MQTT broker credentials and certificates
- Static file serving configuration

The system is designed to run on platforms like Replit with automatic environment detection and WebSocket proxy support for development.

## Recent Updates (January 2025)

### Mobile App Configuration
- **APK Generation Ready**: Added Capacitor Android configuration for mobile app deployment
- **URL Configuration**: Configured correct Replit URLs for mobile app connectivity
  - Web URL: `https://workspace--javomaurocontac.repl.app`
  - WebSocket: `wss://workspace--javomaurocontac.repl.app/ws`
  - API Base: `https://workspace--javomaurocontac.repl.app/api`
- **Environment Detection**: Created `client/src/lib/environment.ts` for robust mobile/web detection
- **Mobile Connectivity**: WebSocket and API clients automatically detect Capacitor environment