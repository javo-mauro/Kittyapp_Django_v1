// Environment detection and URL configuration for Capacitor/Mobile apps

export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.protocol === 'capacitor:' || 
     (window as any).Capacitor !== undefined);
}

export function getReplitUrl(): string {
  // Try different Replit URL patterns until we find one that works
  // You can manually update this with your working Replit URL
  
  // Option 1: Standard repl.co format (most common)
  // return 'https://workspace.javomaurocontac.repl.co';
  
  // Option 2: ID-based format
  // return 'https://77937811-d0d0-4656-91b0-2874ad48ebed.id.repl.co';
  
  // Option 3: App format (newer replits)
  // return 'https://workspace--javomaurocontac.repl.app';
  
  // TEMPORARY SOLUTION: For now, use localhost when in Capacitor
  // This requires you to run the app in development mode when testing the APK
  return 'http://localhost:5000';
}

export function getApiBaseUrl(): string {
  if (isCapacitor()) {
    return `${getReplitUrl()}`;
  }
  return ''; // Default for web or development - no prefix needed
}

export function getWebSocketUrl(): string {
  if (isCapacitor()) {
    // TEMPORARY: Use localhost WebSocket for testing
    // You'll need to use an external service or tunneling solution like ngrok
    return 'ws://localhost:5000/ws';
  }
  
  // For web browser - check if we're in development or production
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}