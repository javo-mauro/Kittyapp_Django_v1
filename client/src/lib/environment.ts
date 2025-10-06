export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
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
    // Usa la variable de entorno definida en .env.android
    return import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}