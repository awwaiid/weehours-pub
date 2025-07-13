// API utility functions with base path support
const getBasePath = () => {
  // In the browser, use the base path from the current URL
  if (typeof window !== 'undefined') {
    const basePath = window.location.pathname.split('/').slice(0, -1).join('/');
    return basePath === '' ? '' : basePath;
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