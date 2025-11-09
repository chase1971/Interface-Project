// Custom hook for managing toast notifications
import { useState, useCallback } from 'react';

/**
 * Custom hook to manage toast notifications
 * @returns {Object} - Object with toast state and show/hide functions
 */
export const useToast = () => {
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'info'
  });

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Type of toast: 'error', 'success', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds (0 = don't auto-close)
   */
  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    setToast({
      show: true,
      message,
      type,
      duration
    });
  }, []);

  /**
   * Hide the toast
   */
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  /**
   * Show error toast
   */
  const showError = useCallback((message, duration = 5000) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  /**
   * Show success toast
   */
  const showSuccess = useCallback((message, duration = 3000) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  /**
   * Show warning toast
   */
  const showWarning = useCallback((message, duration = 4000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  /**
   * Show info toast
   */
  const showInfo = useCallback((message, duration = 4000) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };
};

