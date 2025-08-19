import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kittypaw.app',
  appName: 'KittyPaw Sensors',
  webDir: 'dist/public',
  server: {
    // Para desarrollo local, apunta al servidor Replit
    url: process.env.NODE_ENV === 'development' ? 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co' : undefined,
    cleartext: false
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
