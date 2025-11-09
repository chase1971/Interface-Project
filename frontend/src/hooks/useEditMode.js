import { useState } from 'react';

/**
 * Custom hook to manage edit mode functionality for calendar assignments
 * 
 * @param {Object} params - Configuration object
 * @param {Object} params.manualAdjustments - Current manual adjustments
 * @param {Function} params.setManualAdjustments - Setter for manual adjustments
 * @param {Function} params.getCourseCalendar - Function to get course calendar data
 * @param {Function} params.setCourseCalendar - Function to set course calendar data
 * @param {string} params.selectedCourse - Currently selected course ID
 * @param {Function} params.handleAssignmentDragEnd - Function to clear drag state
 * @returns {Object} Edit mode state and handlers
 */
export const useEditMode = ({
  manualAdjustments,
  setManualAdjustments,
  getCourseCalendar,
  setCourseCalendar,
  selectedCourse,
  handleAssignmentDragEnd
}) => {
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editModeSnapshot, setEditModeSnapshot] = useState(null);

  // Check if changes have been made (compare current adjustments with snapshot)
  const hasChanges = () => {
    if (editModeSnapshot === null) return false;
    return JSON.stringify(manualAdjustments) !== JSON.stringify(editModeSnapshot);
  };

  // Handle entering edit mode
  const handleEnterEditMode = () => {
    // Take a snapshot of current adjustments when entering edit mode
    setEditModeSnapshot(JSON.parse(JSON.stringify(manualAdjustments)));
    // Clear any drag state
    if (handleAssignmentDragEnd) {
      handleAssignmentDragEnd();
    }
    setIsEditMode(true);
  };

  // Handle exiting edit mode
  const handleExitEditMode = () => {
    // Save changes permanently when exiting edit mode
    const courseData = getCourseCalendar(selectedCourse);
    if (courseData) {
      setCourseCalendar(selectedCourse, {
        ...courseData,
        manualAdjustments: manualAdjustments
      });
    }
    // Clear any drag state
    if (handleAssignmentDragEnd) {
      handleAssignmentDragEnd();
    }
    setIsEditMode(false);
    setEditModeSnapshot(null);
  };

  // Handle undo - revert to snapshot
  const handleUndo = () => {
    if (editModeSnapshot !== null && hasChanges()) {
      setManualAdjustments(JSON.parse(JSON.stringify(editModeSnapshot)));
    }
  };

  return {
    // State
    isEditMode,
    editModeSnapshot,
    // Handlers
    handleEnterEditMode,
    handleExitEditMode,
    handleUndo,
    hasChanges
  };
};

