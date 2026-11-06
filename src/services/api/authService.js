import apiClient from './apiClient';

export const validateLogin = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', {
      ...credentials,
      preview: true,
    });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
const authService = {
  /**
   * User Login
   * @param {Object} credentials - { email, password, role }
   * @returns {Promise<Object>} - { token, user }
   */
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      // Store token and user data
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  validateLogin,

  /**
   * User Registration
   * @param {Object} userData - { name, email, password, role }
   * @returns {Promise<Object>} - { token, user }
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      // Store token and user data
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Admin Request
   * @param {Object} adminData - { name, email, reason, department }
   * @returns {Promise<Object>} - { message, requestId }
   */
  requestAdminAccess: async (adminData) => {
    try {
      const response = await apiClient.post('/auth/admin-request', adminData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  sendOtp: (data) => apiClient.post('/send-otp', data),
  verifyOtp: (data) => apiClient.post('/verify-otp', data),
  getAccountDetails: (email, role) => apiClient.get(`/auth/account-details?email=${encodeURIComponent(email)}&role=${role}`),
  getAdminRequests: () => apiClient.get('/auth/admin-requests'),
  decideAdminRequest: (id, decision, reason = '') => apiClient.put(`/auth/admin-requests/${id}/decision`, { decision, reason }),

  /**
   * Verify Authenticator Code
   * @param {string} code - The 6-digit verification code
   * @returns {Promise<Object>} - { valid: boolean }
   */
  verifyAuthenticatorCode: async (code) => {
    try {
      const response = await apiClient.post('/auth/verify-code', { code });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout
   * @returns {Promise<Object>} - { message }
   */
  logout: async () => {
    try {
      const response = await apiClient.post('/auth/logout');
      
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      return response;
    } catch (error) {
      // Clear local storage even if API call fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      throw error;
    }
  },

  /**
   * Get Current User
   * @returns {Promise<Object>} - User object
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update Password
   * @param {Object} passwordData - { currentPassword, newPassword }
   * @returns {Promise<Object>} - { message }
   */
  updatePassword: async (passwordData) => {
    try {
      const response = await apiClient.put('/auth/password', passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reset Password Request
   * @param {string} email - User email
   * @returns {Promise<Object>} - { message }
   */
  requestPasswordReset: async (data) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reset Password with Token
   * @param {Object} resetData - { token, newPassword }
   * @returns {Promise<Object>} - { message }
   */
  resetPassword: async (resetData) => {
    try {
      const response = await apiClient.post('/auth/reset-password', resetData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyCollege: async (name) => {
    try {
      const response = await apiClient.get(`/auth/verify-college?name=${encodeURIComponent(name)}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  subscribeToPlan: async (planData) => {
    try {
      const response = await apiClient.post('/access/subscribe', planData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  checkTrustedDevice: async (email, deviceToken) => {
    try {
      const response = await apiClient.post('/auth/check-trusted-device', { email, deviceToken });
      return response;
    } catch {
      return { trusted: false };
    }
  },

  trustDevice: async (payload) => {
    try {
      const response = await apiClient.post('/auth/trust-device', payload);
      return response;
    } catch (error) {
      console.warn('Could not register trusted device:', error);
    }
  },
};

export default authService;
