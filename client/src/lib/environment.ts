// Environment detection and URL configuration for Capacitor/Mobile apps

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
  return 'https://REPLACE-WITH-YOUR-NGROK-URL.ngrok.io';
}

export function getApiBaseUrl(): string {
  if (isCapacitor()) {
    return `${getReplitUrl()}`;
  }
  return ''; // Default for web or development - no prefix needed
}

export function getWebSocketUrl(): string {
  if (isCapacitor()) {
    // NGROK WEBSOCKET - Usar HTTPS de ngrok convertido a WSS
    // IMPORTANTE: Cambia esta URL por tu URL de ngrok WSS
    // Ejemplo: wss://12345abc.ngrok.io/ws
    return 'wss://REPLACE-WITH-YOUR-NGROK-URL.ngrok.io/ws';
  }
  
  // For web browser - check if we're in development or production
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}