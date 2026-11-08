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

