import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kittypaw.app',
  appName: 'KittyPaw Sensors',
  webDir: 'dist/public',
  server: {
    // Para aplicación móvil, apunta al servidor Replit
    url: 'https://workspace--javomaurocontac.repl.app',
    cleartext: false
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
