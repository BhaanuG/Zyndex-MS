import apiClient from './apiClient';

/**
 * Feedback Service
 * Handles all feedback and contact-related API calls
 */
const feedbackService = {
  /**
   * Submit feedback
   * @param {Object} feedbackData - { name, email, category, message, rating }
   * @returns {Promise<Object>} - { message, feedbackId }
   */
  submitFeedback: async (feedbackData) => {
    try {
      const response = await apiClient.post('/feedback', feedbackData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submit contact form
   * @param {Object} contactData - { name, email, subject, message }
   * @returns {Promise<Object>} - { message }
   */
  submitContact: async (contactData) => {
    try {
      const response = await apiClient.post('/feedback/contact', contactData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all feedback (Admin only)
   * @param {Object} params - { page, size, status, category }
   * @returns {Promise<Object>} - { feedback: [], totalPages, totalElements }
   */
  getAllFeedback: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/feedback?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get feedback by ID (Admin only)
   * @param {string} feedbackId - Feedback ID
   * @returns {Promise<Object>} - Feedback object
   */
  getFeedbackById: async (feedbackId) => {
    try {
      const response = await apiClient.get(`/feedback/${feedbackId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update feedback status (Admin only)
   * @param {string} feedbackId - Feedback ID
   * @param {string} status - New status (pending/reviewed/resolved)
   * @returns {Promise<Object>} - { message }
   */
  updateFeedbackStatus: async (feedbackId, status) => {
    try {
      const response = await apiClient.put(`/feedback/${feedbackId}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Add admin response to feedback (Admin only)
   * @param {string} feedbackId - Feedback ID
   * @param {string} response - Admin response message
   * @returns {Promise<Object>} - { message }
   */
  respondToFeedback: async (feedbackId, response) => {
    try {
      const responseData = await apiClient.post(`/feedback/${feedbackId}/respond`, { response });
      return responseData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete feedback (Admin only)
   * @param {string} feedbackId - Feedback ID
   * @returns {Promise<Object>} - { message }
   */
  deleteFeedback: async (feedbackId) => {
    try {
      const response = await apiClient.delete(`/feedback/${feedbackId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get feedback statistics (Admin only)
   * @returns {Promise<Object>} - { total, byCategory, byStatus, averageRating }
   */
  getFeedbackStats: async () => {
    try {
      const response = await apiClient.get('/feedback/stats');
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submit resource rating
   * @param {string} resourceId - Resource ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Optional comment
   * @returns {Promise<Object>} - { message }
   */
  rateResource: async (resourceId, rating, comment = '') => {
    try {
      const response = await apiClient.post(`/resources/${resourceId}/rate`, { 
        rating, 
        comment 
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get resource ratings
   * @param {string} resourceId - Resource ID
   * @param {Object} params - { page, size }
   * @returns {Promise<Object>} - { ratings: [], averageRating, totalRatings }
   */
  getResourceRatings: async (resourceId, params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/resources/${resourceId}/ratings?${queryParams}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default feedbackService;
