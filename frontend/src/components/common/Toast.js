import React, { useEffect } from 'react';
import './Toast.css';

/**
 * Toast notification component for displaying messages
 * @param {Object} props - Component props
 * @param {string} props.message - The message to display
 * @param {string} props.type - Type of toast: 'error', 'success', 'warning', 'info'
 * @param {boolean} props.show - Whether to show the toast
 * @param {Function} props.onClose - Callback when toast is closed
 * @param {number} props.duration - Duration in milliseconds (default: 5000)
 */
const Toast = ({ message, type = 'info', show, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show || !message) return null;

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      <div className="toast-content">
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;

