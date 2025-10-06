export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.protocol === 'capacitor:' || 
     (window as any).Capacitor !== undefined);
}

export function getReplitUrl(): string {
  // NGROK CONFIGURATION
  // Replace with your ngrok HTTPS URL when using ngrok
  // Example: return 'https://abc123def.ngrok.io';
  
  // IMPORTANTE: Cambia esta URL por tu URL de ngrok HTTPS
  // Ejemplo: https://12345abc.ngrok.io
  return 'https://cb2f8d314cbf.ngrok-free.app';
}

export function getApiBaseUrl(): string {
  if (isCapacitor()) {
    // Usa la variable de entorno definida en .env.android
    return import.meta.env.VITE_API_URL || 'http://localhost:5000';
  }
  return ''; // Para web
}

export function getWebSocketUrl(): string {
  if (isCapacitor()) {
    // NGROK WEBSOCKET - Usar HTTPS de ngrok convertido a WSS
    // IMPORTANTE: Cambia esta URL por tu URL de ngrok WSS
    // Ejemplo: wss://12345abc.ngrok.io/ws
    return 'wss://cb2f8d314cbf.ngrok-free.app/ws';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
