/**
 * Client Device Identity Helper
 * Generates and maintains a unique, persistent hardware/browser UUID token
 * to recognize trusted devices without storing sensitive user credentials.
 */

const DEVICE_STORAGE_KEY = 'zyndex_device_token';

export function getOrCreateDeviceToken() {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!token) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      token = crypto.randomUUID();
    } else {
      token = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_STORAGE_KEY, token);
  }
  return token;
}

export function clearDeviceToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEVICE_STORAGE_KEY);
  localStorage.removeItem('device_token');
}

export function getDeviceInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { browser: 'Browser', os: 'Unknown OS', deviceName: 'Web Client' };
  }

  const userAgent = navigator.userAgent || '';
  let browser = 'Browser';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Safari/')) browser = 'Safari';

  let os = 'Unknown OS';
  if (userAgent.includes('Win')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Linux')) os = 'Linux';

  const deviceName = `${browser} on ${os}`;

  return { browser, os, deviceName };
}

/**
 * Resolves the client's public/network IP address using standard public IP resolution services.
 * Caches the resolved IP in memory and localStorage for fast synchronous reuse across sessions.
 */
let cachedClientIp = null;

export async function fetchClientPublicIp() {
  if (typeof window === 'undefined') return '';
  if (cachedClientIp) return cachedClientIp;

  try {
    const saved = localStorage.getItem('zyndex_client_ip');
    if (saved && saved !== '127.0.0.1' && saved !== '0:0:0:0:0:0:0:1' && saved !== '::1') {
      cachedClientIp = saved;
    }
  } catch (e) {}

  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipapi.co/json/'
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const ip = (data.ip || data.query || '').trim();
        if (ip && ip !== '127.0.0.1' && ip !== '0:0:0:0:0:0:0:1' && ip !== '::1') {
          cachedClientIp = ip;
          try {
            localStorage.setItem('zyndex_client_ip', ip);
          } catch (e) {}
          return ip;
        }
      }
    } catch (err) {
      // try next endpoint
    }
  }

  return cachedClientIp || '';
}

export function getCachedClientIp() {
  if (cachedClientIp) return cachedClientIp;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('zyndex_client_ip');
      if (saved && saved !== '127.0.0.1' && saved !== '0:0:0:0:0:0:0:1' && saved !== '::1') {
        cachedClientIp = saved;
        return saved;
      }
    } catch (e) {}
  }
  return '';
}

export function formatSessionDuration(seconds) {
  const secs = Number(seconds) || 0;
  if (secs <= 0) return 'Just started';
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remainingSecs = secs % 60;

  if (hrs > 0) {
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }
  if (mins > 0) {
    return `${mins} min${mins > 1 ? 's' : ''}`;
  }
  return `${remainingSecs} sec${remainingSecs > 1 ? 's' : ''}`;
}

export function formatDateTime(isoString) {
  if (!isoString) return 'Active Now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return String(isoString);
  }
}

export function formatDateOnly(isoString) {
  if (!isoString) return 'Today';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

export function formatTimeOnly(isoString) {
  if (!isoString) return 'Now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '';
  }
}


