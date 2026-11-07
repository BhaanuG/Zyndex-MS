import apiClient from './apiClient';

/**
 * User Service
 * Handles all user-related API calls
 */
const userService = {
  /**
   * Get user profile
   * @param {string} userId - User ID (optional, defaults to current user)
   * @returns {Promise<Object>} - User profile object
   */
  getProfile: async (userId = 'me') => {
    try {
      const response = await apiClient.get(`/users/${userId}/profile`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - { name, email, bio, avatar }
   * @returns {Promise<Object>} - Updated user object
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put('/users/profile', profileData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload avatar
   * @param {FormData} avatarData - FormData containing avatar file
   * @returns {Promise<Object>} - { avatarUrl }
   */
  uploadAvatar: async (avatarData) => {
    try {
      const response = await apiClient.post('/users/avatar', avatarData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's downloaded resources
   * @param {Object} params - { page, size }
   * @returns {Promise<Object>} - { resources: [], totalPages }
   */
  getDownloadHistory: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/users/downloads?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user's favorites/bookmarks
   * @param {Object} params - { page, size }
   * @returns {Promise<Object>} - { resources: [], totalPages }
   */
  getFavorites: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/users/favorites?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getRecentViews: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/users/recent-views?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Add resource to favorites
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} - { message }
   */
  addToFavorites: async (resourceId) => {
    try {
      const response = await apiClient.post(`/users/favorites/${resourceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Remove resource from favorites
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} - { message }
   */
  removeFromFavorites: async (resourceId) => {
    try {
      const response = await apiClient.delete(`/users/favorites/${resourceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all users (Admin only)
   * @param {Object} params - { page, size, role, search }
   * @returns {Promise<Object>} - { users: [], totalPages, totalElements }
   */
  getAllUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/users?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getUserStats: async () => {
    try {
      return await apiClient.get('/users/stats');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update user role (Admin only)
   * @param {string} userId - User ID
   * @param {string} role - New role (user/admin)
   * @returns {Promise<Object>} - { message }
   */
  updateUserRole: async (userId, role) => {
    try {
      const response = await apiClient.put(`/users/${userId}/role`, { role });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Suspend/Activate user (Admin only)
   * @param {string} userId - User ID
   * @param {boolean} active - Active status
   * @returns {Promise<Object>} - { message }
   */
  updateUserStatus: async (userId, active) => {
    try {
      const response = await apiClient.put(`/users/${userId}/status`, { active });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete user (Admin only)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - { message }
   */
  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  createUser: async (userData) => {
    try {
      const response = await apiClient.post('/users', userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await apiClient.put(`/users/${userId}`, userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  forceLogoutUser: async (userId) => {
    return await apiClient.post(`/users/${userId}/force-logout`);
  },

  restoreUserAccess: async (userId) => {
    return await apiClient.post(`/users/${userId}/restore-access`);
  },

  forceLogoutAllUsers: async () => {
    return await apiClient.post('/users/force-logout-all');
  },

  getMaintenanceMode: async () => {
    return await apiClient.get('/users/maintenance-mode');
  },

  setMaintenanceMode: async (enabled) => {
    return await apiClient.post('/users/maintenance-mode', { enabled });
  },

  finalizeMaintenanceActive: async () => {
    return await apiClient.post('/users/maintenance-officially-active');
  },

  /**
   * Get user statistics
   * @returns {Promise<Object>} - { downloads, favorites, uploads }
   */
  getUserStats: async () => {
    try {
      const response = await apiClient.get('/users/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default userService;
