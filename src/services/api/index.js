/**
 * API Services Index
 * Central export point for all API services
 */

import apiClient from './apiClient';
import authService from './authService';
import resourceService from './resourceService';
import userService from './userService';
import feedbackService from './feedbackService';
import logService from './logService';

// Export all services
export {
  apiClient,
  authService,
  resourceService,
  userService,
  feedbackService,
  logService,
};

// Default export
export default {
  auth: authService,
  resources: resourceService,
  users: userService,
  feedback: feedbackService,
  logs: logService,
};

