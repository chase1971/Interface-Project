import { useState } from 'react';
import { formatDate, normalizeDate, parseDate } from '../utils/calendarUtils';

/**
 * Custom hook to manage drag and drop functionality for calendar assignments
 * 
 * @param {Object} params - Configuration object
 * @param {Array} params.originalAssignments - Original assignments array
 * @param {Array} params.acceptedFutureAssignments - Accepted future assignments array
 * @param {Object} params.manualAdjustments - Current manual adjustments
 * @param {Function} params.setManualAdjustments - Setter for manual adjustments
 * @param {Function} params.applyAdjustments - Function to apply adjustments to an assignment
 * @param {Function} params.getAssignmentId - Function to get unique ID for an assignment
 * @param {Date|null} params.expandedDate - Currently expanded date (to close on drag start)
 * @param {Function} params.setExpandedDate - Setter for expanded date
 * @returns {Object} Drag and drop state and handlers
 */
export const useDragAndDrop = ({
  originalAssignments,
  acceptedFutureAssignments,
  manualAdjustments,
  setManualAdjustments,
  applyAdjustments,
  getAssignmentId,
  expandedDate,
  setExpandedDate
}) => {
  // Drag state
  const [draggedAssignment, setDraggedAssignment] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [pickedUpAssignment, setPickedUpAssignment] = useState(null);

  // Handle assignment drag start
  const handleAssignmentDragStart = (e, assignment, position, dateContext) => {
    // Store as picked up first (will become dragged if mouse moves)
    // dateContext tells us which date (start or due) is being dragged
    setPickedUpAssignment({
      assignment: assignment,
      dateType: dateContext?.dateType || null // 'start' or 'due'
    });
    setDragPosition(position);
    setDragStartPosition(position); // Store where drag started
    // Don't set draggedAssignment yet - only set it when actually dragging
    // Close expanded modal if open
    if (expandedDate) {
      setExpandedDate(null);
    }
  };

  // Handle assignment actually dragging (mouse moved)
  const handleAssignmentActuallyDragging = (assignment, position, dateType) => {
    // Now it's actually being dragged, not just picked up
    setDraggedAssignment({
      assignment: assignment,
      dateType: dateType || null // 'start' or 'due'
    });
    setDragPosition(position);
  };

  // Handle assignment drag move
  const handleAssignmentDragMove = (e, date) => {
    if (pickedUpAssignment && dragStartPosition) {
      // Always update drag position to keep ghost image following cursor
      setDragPosition({ x: e.clientX, y: e.clientY });
      
      // Check if we've moved enough to be considered "dragging"
      const deltaX = Math.abs(e.clientX - dragStartPosition.x);
      const deltaY = Math.abs(e.clientY - dragStartPosition.y);
      
      if (deltaX > 5 || deltaY > 5) {
        // Actually dragging - set draggedAssignment
        if (pickedUpAssignment && !draggedAssignment) {
          const assignment = typeof pickedUpAssignment === 'object' && pickedUpAssignment.assignment 
            ? pickedUpAssignment.assignment 
            : pickedUpAssignment;
          const dateType = typeof pickedUpAssignment === 'object' && pickedUpAssignment.dateType 
            ? pickedUpAssignment.dateType 
            : null;
          handleAssignmentActuallyDragging(assignment, { x: e.clientX, y: e.clientY }, dateType);
        }
      }
    } else if (draggedAssignment) {
      // If already dragging, just update position
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle assignment drag end
  const handleAssignmentDragEnd = () => {
    // Clear drag state completely
    setDraggedAssignment(null);
    setPickedUpAssignment(null);
    setDragPosition(null);
    setDragStartPosition(null);
  };

  // Check if user actually dragged (moved mouse significantly)
  const hasActuallyDragged = () => {
    if (!dragStartPosition || !dragPosition) return false;
    const deltaX = Math.abs(dragPosition.x - dragStartPosition.x);
    const deltaY = Math.abs(dragPosition.y - dragStartPosition.y);
    return deltaX > 5 || deltaY > 5; // Moved more than 5px
  };

  // Handle assignment drop (move to new date)
  const handleAssignmentDrop = (assignment, newDate) => {
    // Extract assignment and dateType from draggedAssignment or pickedUpAssignment
    let assignmentToDrop = assignment;
    let dateTypeToMove = null;
    
    if (!assignmentToDrop) {
      const source = draggedAssignment || pickedUpAssignment;
      if (source) {
        if (typeof source === 'object' && source.assignment) {
          assignmentToDrop = source.assignment;
          dateTypeToMove = source.dateType;
        } else {
          assignmentToDrop = source;
        }
      }
    } else {
      // If assignment was passed directly, extract dateType from state
      if (draggedAssignment && typeof draggedAssignment === 'object' && draggedAssignment.dateType) {
        dateTypeToMove = draggedAssignment.dateType;
      } else if (pickedUpAssignment && typeof pickedUpAssignment === 'object' && pickedUpAssignment.dateType) {
        dateTypeToMove = pickedUpAssignment.dateType;
      }
    }
    
    if (!assignmentToDrop || !newDate) {
      handleAssignmentDragEnd();
      return;
    }

    // Find the original assignment (before adjustments) to get the correct ID
    // The dragged assignment might have adjustments applied, so we need to find it by name
    // and reverse-engineer which original assignment it came from
    let originalAssignment = null;
    
    // Try to find the original in the originalAssignments array by matching itemName
    // Since dates might have been adjusted, we match by name only
    const candidates = originalAssignments.filter(a => a.itemName === assignmentToDrop.itemName);
    
    if (candidates.length === 1) {
      originalAssignment = candidates[0];
    } else if (candidates.length > 1) {
      // Multiple assignments with same name - try to match by checking which one
      // would produce this assignment when adjustments are applied
      for (const candidate of candidates) {
        const candidateId = getAssignmentId(candidate);
        const adjusted = applyAdjustments(candidate);
        // Check if the adjusted assignment matches what we're dragging
        if (adjusted.startDate === assignmentToDrop.startDate && adjusted.dueDate === assignmentToDrop.dueDate) {
          originalAssignment = candidate;
          break;
        }
      }
      // If still not found, use the first one
      if (!originalAssignment) {
        originalAssignment = candidates[0];
      }
    } else {
      // Not found in originalAssignments, try acceptedFutureAssignments
      const futureCandidates = acceptedFutureAssignments.filter(a => a.itemName === assignmentToDrop.itemName);
      if (futureCandidates.length > 0) {
        originalAssignment = futureCandidates[0];
      } else {
        // Fallback: use the assignment as-is (might be from offsetAssignments)
        originalAssignment = assignmentToDrop;
      }
    }
    
    const assignmentId = getAssignmentId(originalAssignment);
    const dateStr = formatDate(normalizeDate(newDate));
    
    // Update the appropriate date
    const newAdjustments = { ...manualAdjustments };
    if (!newAdjustments[assignmentId]) {
      newAdjustments[assignmentId] = {};
    }
    
    // Determine which date to move based on which date was actually dragged
    // If we know which date type was dragged (from the date context), use that
    if (dateTypeToMove === 'start') {
      // User dragged the start date - move it
      newAdjustments[assignmentId].startDate = dateStr;
    } else if (dateTypeToMove === 'due') {
      // User dragged the due date - move it
      newAdjustments[assignmentId].dueDate = dateStr;
    } else if (originalAssignment.startDate && !originalAssignment.dueDate) {
      // Only start date exists, move it
      newAdjustments[assignmentId].startDate = dateStr;
    } else if (originalAssignment.dueDate && !originalAssignment.startDate) {
      // Only due date exists, move it
      newAdjustments[assignmentId].dueDate = dateStr;
    } else if (originalAssignment.startDate && originalAssignment.dueDate) {
      // Both dates exist - check which one is closer to the drop date
      // (fallback if we don't know which was dragged)
      const originalStart = parseDate(originalAssignment.startDate);
      const originalDue = parseDate(originalAssignment.dueDate);
      
      // Calculate distance from drop date to original dates
      const distToStart = Math.abs((newDate - originalStart) / (1000 * 60 * 60 * 24));
      const distToDue = Math.abs((newDate - originalDue) / (1000 * 60 * 60 * 24));
      
      // Move the date that's closer (or if equal, prefer moving start date)
      if (distToStart <= distToDue) {
        newAdjustments[assignmentId].startDate = dateStr;
      } else {
        newAdjustments[assignmentId].dueDate = dateStr;
      }
    }
    
    setManualAdjustments(newAdjustments);
    
    // Don't save to localStorage during edit mode - only save when exiting
    // Clear drag state after drop
    handleAssignmentDragEnd();
  };

  return {
    // State
    draggedAssignment,
    dragPosition,
    dragStartPosition,
    pickedUpAssignment,
    // Handlers
    handleAssignmentDragStart,
    handleAssignmentDragMove,
    handleAssignmentDragEnd,
    handleAssignmentDrop,
    hasActuallyDragged
  };
};

