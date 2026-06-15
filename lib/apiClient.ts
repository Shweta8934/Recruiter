import { getStoredToken } from './auth';

export async function fetchJson(url: string, options: RequestInit = {}) {
  if (url.startsWith('/api/')) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/ai-recruitment-platform';
    url = `${basePath}${url}`;
  }
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('ngrok-skip-browser-warning', 'true');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return {};
  }
  
  if (!res.ok) throw new Error(data?.error || `HTTP error ${res.status}`);
  return data;
}
