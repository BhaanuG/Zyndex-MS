import apiClient from './apiClient';

/**
 * Log Service for managing system and platform audit logs stored in MySQL.
 */
export const logService = {
  /**
   * Get paginated logs with optional filters
   * @param {Object} params
   * @param {number} [params.page=0]
   * @param {number} [params.size=20]
   * @param {string} [params.service]
   * @param {string} [params.level]
   * @param {string} [params.search]
   * @returns {Promise<{logs: Array, total: number, page: number, size: number, stats: Object}>}
   */
  async getLogs(params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 20,
      service: params.service || '',
      level: params.level || '',
      search: params.search || '',
      category: params.category || '',
      sort: params.sort || '',
    };
    return await apiClient.get('/logs', { params: queryParams });
  },

  /**
   * Record a new log entry
   * @param {Object} logData
   * @param {string} logData.service
   * @param {string} logData.level
   * @param {string} logData.action
   * @param {string} [logData.actorEmail]
   * @param {string} [logData.details]
   * @param {string} [logData.status]
   * @returns {Promise<{message: string}>}
   */
  async createLog(logData) {
    return await apiClient.post('/logs', logData);
  },

  /**
   * Get live engagement metrics and trend graph points
   * @returns {Promise<{totalReadingMinutes: number, totalSessions: number, totalReaders: number, activeReadersToday: number, avgSessionMinutes: number, trendData: Array}>}
   */
  async getEngagementAnalytics() {
    return await apiClient.get('/usage/engagement/analytics');
  },

  /**
   * Get live reading history and engagement records from SQL
   * @param {Object} [params]
   * @param {number} [params.page=0]
   * @param {number} [params.size=20]
   * @returns {Promise<{records: Array, total: number, page: number, size: number}>}
   */
  async getLiveReadingHistory(params = {}) {
    const queryParams = {
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    return await apiClient.get('/usage/history/live', { params: queryParams });
  },
};

export default logService;
