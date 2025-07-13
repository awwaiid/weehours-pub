// Extend window type to include our global variable
declare global {
  interface Window {
    __BASE_PATH__?: string;
  }
}

// API utility functions with base path support
const getBasePath = () => {
  // In the browser, get base path from global variable or URL
  if (typeof window !== 'undefined') {
    // Use the global variable injected by the layout
    if (window.__BASE_PATH__) {
      return window.__BASE_PATH__;
    }
    
    // Try to get from meta tag
    const nextBasePath = document.querySelector('meta[name="base-path"]')?.getAttribute('content');
    if (nextBasePath) {
      return nextBasePath;
    }
    
    // Fallback: detect from current URL structure
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    
    // Check if first segment looks like a base path (not 'api', common page names, etc.)
    if (segments.length > 0 && !['api', 'auth', '_next'].includes(segments[0])) {
      return '/' + segments[0];
    }
    
    return '';
  }
  
  // For SSR, use the BASE_PATH environment variable
  return process.env.BASE_PATH || '';
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const basePath = getBasePath();
  const url = `${basePath}${endpoint}`;
  
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};

export const getWebSocketUrl = () => {
  const basePath = getBasePath();
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${basePath}/ws`;
};