import { getStoredToken } from './auth';

export async function fetchJson(url: string, options: RequestInit = {}) {
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
