// Environment detection and URL configuration for Capacitor/Mobile apps

export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.protocol === 'capacitor:' || 
     (window as any).Capacitor !== undefined);
}

export function getReplitUrl(): string {
  // Return the actual public URL of your Replit
  // This will be accessible from mobile devices
  return 'https://workspace--javomaurocontac.repl.app';
}

export function getApiBaseUrl(): string {
  if (isCapacitor()) {
    return `${getReplitUrl()}/api`;
  }
  return '/api'; // Default for web or development
}

export function getWebSocketUrl(): string {
  if (isCapacitor()) {
    return `wss://workspace--javomaurocontac.repl.app/ws`;
  }
  
  // For web browser
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}