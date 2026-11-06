import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8080/api` : 'http://localhost:8080/api');

function withCacheBust(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_ts=${Date.now()}`;
}

function toQueryString(params = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    queryParams.append(key, value);
  });
  return queryParams.toString();
}

/**
 * Resource Service
 * Handles all resource-related API calls (CRUD operations for educational resources)
 */
const resourceService = {
  /**
   * Get all resources with pagination and filters
   * @param {Object} params - { page, size, category, search, sort }
   * @returns {Promise<Object>} - { resources: [], totalPages, totalElements, currentPage }
   */
  getAllResources: async (params = {}) => {
    try {
      const queryParams = toQueryString(params);
      const response = await apiClient.get(withCacheBust(`/resources?${queryParams}`));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get resource by ID
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} - Resource object
   */
  getResourceById: async (resourceId) => {
    try {
      const response = await apiClient.get(withCacheBust(`/resources/${resourceId}`));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Search resources
   * @param {Object} searchParams - { query, category, type, page, size }
   * @returns {Promise<Object>} - { resources: [], totalPages, totalElements }
   */
  searchResources: async (searchParams) => {
    try {
      const queryParams = toQueryString(searchParams);
      const response = await apiClient.get(withCacheBust(`/resources/search?${queryParams}`));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get resources by category
   * @param {string} category - Category name
   * @param {Object} params - { page, size }
   * @returns {Promise<Object>} - { resources: [], totalPages, totalElements }
   */
  getResourcesByCategory: async (category, params = {}) => {
    try {
      const queryParams = toQueryString({ ...params, category });
      const response = await apiClient.get(withCacheBust(`/resources?${queryParams}`));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload new resource (Admin only)
   * @param {FormData} resourceData - FormData with resource details and file
   * @returns {Promise<Object>} - { message, resourceId }
   */
  uploadResource: async (resourceData) => {
    try {
      const response = await apiClient.post('/resources', resourceData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update resource (Admin only)
   * @param {string} resourceId - Resource ID
   * @param {FormData} resourceData - Updated resource data
   * @returns {Promise<Object>} - { message, resource }
   */
  updateResource: async (resourceId, resourceData) => {
    try {
      const response = await apiClient.put(`/resources/${resourceId}`, resourceData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete resource (Admin only)
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} - { message }
   */
  deleteResource: async (resourceId) => {
    try {
      const response = await apiClient.delete(`/resources/${resourceId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Download resource file
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Blob>} - File blob
   */
  downloadResource: async (resourceId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        if (contentType.includes('application/json')) {
          throw await response.json();
        }
        throw new Error('Download failed.');
      }

      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.blob();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get resource categories
   * @returns {Promise<Array>} - Array of categories
   */
  getCategories: async () => {
    try {
      const response = await apiClient.get(withCacheBust('/resources/categories'));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get resource statistics (Admin only)
   * @returns {Promise<Object>} - { totalResources, byCategory, recentUploads }
   */
  getResourceStats: async () => {
    try {
      const response = await apiClient.get(withCacheBust('/resources/stats'));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get featured/recommended resources
   * @param {number} limit - Number of resources to return
   * @returns {Promise<Array>} - Array of featured resources
   */
  getFeaturedResources: async (limit = 6) => {
    try {
      const response = await apiClient.get(withCacheBust(`/resources/featured?limit=${limit}`));
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Request a secure short-lived preview token
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} - { token }
   */
  getPreviewToken: async (resourceId) => {
    try {
      const response = await apiClient.post(`/resources/${resourceId}/download-token`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Track resource download/view
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} - { message }
   */
  trackResourceAccess: async (resourceId) => {
    try {
      const response = await apiClient.post(`/resources/${resourceId}/track`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  trackReadingDuration: async (resourceId, duration) => {
    try {
      const response = await apiClient.post(`/resources/${resourceId}/track-duration`, { duration });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default resourceService;
