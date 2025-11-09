import { useState } from 'react';

/**
 * Custom hook to manage modal state for calendar application
 * 
 * @returns {Object} Modal state and handlers
 */
export const useModals = () => {
  // Expanded date modal state
  const [expandedDate, setExpandedDate] = useState(null);
  const [expandedPosition, setExpandedPosition] = useState({ top: 0, left: 0 });

  // Future planning modal state
  const [showFuturePlanning, setShowFuturePlanning] = useState(false);

  // Import calendar modal state
  const [showImportCalendar, setShowImportCalendar] = useState(false);

  // Clear calendar modal state
  const [showClearCalendar, setShowClearCalendar] = useState(false);

  // Edit assignment modal state
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);

  // Close expanded modal
  const closeExpandedModal = () => {
    setExpandedDate(null);
  };

  // Open expanded modal
  const openExpandedModal = (date, position) => {
    setExpandedPosition(position);
    setExpandedDate(date);
  };

  // Close all modals (useful for navigation)
  const closeAllModals = () => {
    setExpandedDate(null);
    setShowFuturePlanning(false);
    setShowImportCalendar(false);
    setShowClearCalendar(false);
    setShowEditAssignmentModal(false);
  };

  return {
    // Expanded date modal
    expandedDate,
    expandedPosition,
    setExpandedDate,
    setExpandedPosition,
    closeExpandedModal,
    openExpandedModal,
    
    // Future planning modal
    showFuturePlanning,
    setShowFuturePlanning,
    
    // Import calendar modal
    showImportCalendar,
    setShowImportCalendar,
    
    // Clear calendar modal
    showClearCalendar,
    setShowClearCalendar,
    
    // Edit assignment modal
    showEditAssignmentModal,
    setShowEditAssignmentModal,
    
    // Utility
    closeAllModals
  };
};

