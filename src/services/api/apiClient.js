import axios from 'axios';

const getProtocol = () => (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:');
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `${getProtocol()}//${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isSessionExpiredDispatched = false;

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach device token header if available so active heartbeat tracks session activity
    try {
      const devToken = localStorage.getItem('zyndex_device_token') || localStorage.getItem('device_token');
      if (devToken) {
        config.headers['X-Device-Token'] = devToken;
      }
    } catch (e) {}

    // Let the browser set the multipart boundary for FormData uploads, and disable request timeout for large file uploads.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      if (!config.timeout || config.timeout === 30000) {
        config.timeout = 0; // No timeout for file uploads
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      const requestUrl = error.config?.url || '';
      const hasToken = !!localStorage.getItem('auth_token');
      const isAuthFormRequest =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/check-login') ||
        requestUrl.includes('/auth/verify-code') ||
        requestUrl.includes('/auth/forgot-password') ||
        requestUrl.includes('/auth/reset-password');
      
      let parsedError = {
        message: 'Something went wrong. Please try again.',
        status: status,
        code: data?.code || 'UNKNOWN_ERROR'
      };

      if (typeof data === 'string') {
        parsedError.message = data;
      } else if (data && data.message) {
        parsedError.message = data.message;
      } else if (data && data.error) {
        parsedError.message = data.error;
      } else {
        // Fallback messages based on HTTP status
        switch (status) {
          case 400:
            parsedError.message = 'Invalid request. Please check your inputs.';
            break;
          case 401:
            parsedError.message = 'Your session has expired. Please log in again.';
            break;
          case 403:
            parsedError.message = 'You do not have permission to perform this action.';
            break;
          case 404:
            parsedError.message = 'The requested resource was not found.';
            break;
          case 500:
            parsedError.message = 'Something went wrong on the server. Please try again.';
            break;
          case 503:
            parsedError.message = 'The service is temporarily unavailable. Please try again.';
            break;
        }
      }

      switch (status) {
        case 401:
        case 403:
          // Ignore "Authorization token is missing" when no token is in storage (prevents secondary cascade popups)
          if (parsedError.message === 'Authorization token is missing' && !hasToken) {
            break;
          }

          // For 403 Forbidden, ONLY trigger session termination when it is explicitly an account/session revocation or termination
          const isTerminationOrSessionError =
            status === 401 ||
            (status === 403 && (
              parsedError.message.toLowerCase().includes('terminate') ||
              parsedError.message.toLowerCase().includes('session was') ||
              parsedError.message.toLowerCase().includes('superseded') ||
              parsedError.message.toLowerCase().includes('inactive account')
            ));

          // Only trigger timeout notification when an already-authenticated session expires or is terminated.
          if (hasToken && !isAuthFormRequest && isTerminationOrSessionError && !isSessionExpiredDispatched) {
            isSessionExpiredDispatched = true;
            const savedUser = localStorage.getItem('user_data');
            let role = 'user';
            try {
              if (savedUser) role = JSON.parse(savedUser)?.role || 'user';
            } catch (e) {}

            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');

            // Dispatch global event so SessionTimeoutModal pops up gracefully
            if (typeof window !== 'undefined') {
              const reasonMsg = parsedError.message || 'Your session has ended. Please log in again to continue.';
              window.dispatchEvent(
                new CustomEvent('zyndex:session-expired', {
                  detail: {
                    role,
                    reason: reasonMsg,
                    code: parsedError.code
                  }
                })
              );
            }

            // Reset after short cooldown in case of legitimate subsequent sessions
            setTimeout(() => {
              isSessionExpiredDispatched = false;
            }, 3000);
          }
          break;
        case 404:
          console.error('Resource not found:', parsedError.message);
          break;
        case 500:
          console.error('Server error:', parsedError.message);
          break;
        case 503:
          // If 503 is due to maintenance mode, trigger the session-expired maintenance modal for logged in users
          if (hasToken && !isAuthFormRequest && parsedError.message && parsedError.message.toLowerCase().includes('maintenance') && !isSessionExpiredDispatched) {
            isSessionExpiredDispatched = true;
            const savedUser = localStorage.getItem('user_data');
            let role = 'user';
            try {
              if (savedUser) role = JSON.parse(savedUser)?.role || 'user';
            } catch (e) {}

            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('zyndex:session-expired', {
                  detail: {
                    role,
                    reason: parsedError.message
                  }
                })
              );
            }

            setTimeout(() => {
              isSessionExpiredDispatched = false;
            }, 3000);
          }
          break;
        default:
          console.error('API Error:', parsedError.message);
      }
      
      return Promise.reject(parsedError);
    } else if (error.request) {
      // Network error (no response received)
      console.error('Network failure:', error.message);
      return Promise.reject({
        message: 'Unable to reach the authentication service. Please try again.',
        code: 'NETWORK_FAILURE',
        status: 503
      });
    } else {
      console.error('Error:', error.message);
      return Promise.reject({
        message: error.message || 'Something went wrong. Please try again.',
        code: 'UNKNOWN_ERROR',
        status: 500
      });
    }
  }
);

export default apiClient;
